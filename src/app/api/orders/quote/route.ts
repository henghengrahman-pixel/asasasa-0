import {NextRequest,NextResponse} from 'next/server';
import {z} from 'zod';
import {db} from '@/lib/db';
import {calculateLineTotal} from '@/lib/marketplace';
import {isTrustedMutationOrigin} from '@/lib/request-security';
import {GUEST_COOKIE,newGuestCheckout,parseGuestCheckout} from '@/lib/guest-checkout';
import {getPublicEnv} from '@/lib/runtime-env';
const input=z.object({serviceId:z.string().min(1),partnerId:z.string().min(1),areaId:z.string().min(1),quantity:z.number().int().min(1).max(20)});
export async function POST(req:NextRequest){
 if(!isTrustedMutationOrigin(req))return NextResponse.json({ok:false,message:'Origin tidak diizinkan'},{status:403});
 const parsed=input.safeParse(await req.json().catch(()=>null));if(!parsed.success)return NextResponse.json({ok:false,message:'Pilih layanan, mitra, area, dan jumlah yang valid.'},{status:400});
 const {serviceId,partnerId,areaId,quantity}=parsed.data;
 const [service,area,ps]=await Promise.all([
  db.service.findFirst({where:{id:serviceId,active:true,archivedAt:null,category:{active:true,archivedAt:null}},select:{basePrice:true,minimumCharge:true,serviceAreas:{select:{areaId:true,active:true}}}}),
  db.area.findFirst({where:{id:areaId,active:true},select:{surcharge:true}}),
  db.partnerService.findFirst({where:{serviceId,partnerId,active:true,partner:{user:{active:true},online:true,dispatchEnabled:true,status:{notIn:['REJECTED','SUSPENDED']},storefrontStatus:{not:'HIDDEN'},areas:{some:{areaId}}}},select:{customPrice:true}})
 ]);
 if(!service||!area||!ps||service.serviceAreas.length>0&&!service.serviceAreas.some(a=>a.areaId===areaId&&a.active))return NextResponse.json({ok:false,message:'Layanan atau mitra tidak tersedia di area ini.'},{status:409});
 const unitPrice=ps.customPrice??service.basePrice;
 const subtotal=calculateLineTotal({unitPrice,quantity,minimumCharge:service.minimumCharge});
 const total=subtotal+area.surcharge;
 if(!Number.isSafeInteger(total)||total<0)return NextResponse.json({ok:false,message:'Harga tidak valid.'},{status:409});
 const response=NextResponse.json({ok:true,unitPrice,subtotal,areaSurcharge:area.surcharge,total,currency:'IDR',calculatedAt:new Date().toISOString()});
 if(!parseGuestCheckout(req.cookies.get(GUEST_COOKIE)?.value))response.cookies.set(GUEST_COOKIE,newGuestCheckout(),{httpOnly:true,secure:getPublicEnv().NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:60*60*24*7});
 return response;
}
