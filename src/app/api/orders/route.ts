import {NextRequest,NextResponse} from 'next/server';
import {createHash} from 'node:crypto';
import {GUEST_COOKIE,parseGuestCheckout} from '@/lib/guest-checkout';
import {Prisma} from '@prisma/client';
import {z} from 'zod';
import {db} from '@/lib/db';
import {commission} from '@/lib/money';
import {publicOrderId} from '@/lib/id';
import {calculateLineTotal,validationFieldMap} from '@/lib/marketplace';
import {normalizeIndonesianPhone} from '@/lib/phone';
import {isTrustedMutationOrigin} from '@/lib/request-security';
import {currentCustomer} from '@/lib/customer-auth';
import {createCustomerSession} from '@/lib/customer-auth';

const schema=z.object({
  serviceId:z.string().min(1),partnerId:z.string().min(1),areaId:z.string().min(1),
  name:z.string().trim().min(2).max(100),
  phone:z.string().transform((value,ctx)=>{try{return normalizeIndonesianPhone(value)}catch{ctx.addIssue({code:'custom',message:'Nomor WhatsApp tidak valid.'});return z.NEVER}}),
  address:z.string().trim().min(8).max(500),scheduledAt:z.coerce.date(),quantity:z.number().int().min(1).max(20),
  note:z.string().max(1000).nullable().optional(),latitude:z.number().min(-90).max(90).optional(),longitude:z.number().min(-180).max(180).optional(),
  locationNote:z.string().max(300).nullable().optional(),paymentMethod:z.enum(['CASH','TRANSFER']).default('CASH'),expectedTotal:z.number().int().nonnegative().safe()
});
const fieldMessages:Record<string,string>={serviceId:'Layanan tidak valid.',partnerId:'Mitra tidak valid.',areaId:'Pilih area layanan.',name:'Nama minimal 2 karakter.',phone:'Masukkan nomor HP/WhatsApp yang valid.',address:'Alamat terlalu singkat. Masukkan alamat lengkap minimal 8 karakter.',scheduledAt:'Pilih jadwal layanan yang valid.',quantity:'Jumlah harus antara 1 sampai 20.',note:'Catatan terlalu panjang.',latitude:'Lokasi perangkat tidak valid.',longitude:'Lokasi perangkat tidak valid.',locationNote:'Catatan lokasi terlalu panjang.',paymentMethod:'Metode pembayaran tidak valid.'};
const businessMessages:Record<string,string>={SERVICE_UNAVAILABLE:'Layanan saat ini tidak tersedia.',SERVICE_NOT_AVAILABLE_IN_AREA:'Layanan belum tersedia di area yang dipilih.',SCHEDULE_TOO_SOON:'Jadwal terlalu dekat. Silakan pilih jadwal yang lebih tersedia.',PARTNER_UNAVAILABLE:'Mitra yang dipilih sedang tidak tersedia untuk layanan/area ini. Silakan pilih mitra lain.',AREA_UNAVAILABLE:'Area yang dipilih sedang tidak tersedia.'};
function apiError(code:string,message:string,status:number,fields?:Record<string,string>){return NextResponse.json({ok:false,code,message,...(fields?{fields}:{})},{status})}

async function establishSession(publicId:string){
  const order=await db.order.findUnique({where:{publicId},select:{customer:{select:{id:true,user:{select:{id:true,sessionVersion:true}}}}}});
  if(order)await createCustomerSession({userId:order.customer.user.id,customerId:order.customer.id,sessionVersion:order.customer.user.sessionVersion});
}

export async function POST(req:NextRequest){
  try{
    if(!isTrustedMutationOrigin(req))return apiError('UNTRUSTED_ORIGIN','Permintaan tidak diizinkan.',403);
    const authenticated=await currentCustomer();
    const key=req.headers.get('idempotency-key');
    if(!key||!/^[-a-zA-Z0-9_]{20,120}$/.test(key))return apiError('INVALID_REQUEST','Permintaan tidak valid. Silakan muat ulang halaman dan coba lagi.',400);
    let raw:unknown;try{raw=await req.json()}catch{return apiError('INVALID_JSON','Data pesanan tidak dapat dibaca. Silakan coba lagi.',400)}
    const parsed=schema.safeParse(raw);
    if(!parsed.success){const fields=validationFieldMap(parsed.error.issues,fieldMessages);return apiError('VALIDATION_ERROR','Periksa kembali data pesanan.',400,fields)}
    const data=parsed.data;
    const guest=authenticated?null:parseGuestCheckout(req.cookies.get(GUEST_COOKIE)?.value);
    if(!authenticated&&!guest)return apiError('GUEST_CONTEXT_REQUIRED','Sesi checkout belum siap. Muat ulang checkout dan konfirmasi harga.',403);
    const scope=authenticated?`create-order:${authenticated.customer.id}`:`create-order:guest:${guest}`;
    const fingerprint=createHash('sha256').update(JSON.stringify(data)).digest('hex');
    const existing=await db.idempotencyKey.findUnique({where:{scope_key:{scope,key}}});
    if(existing){
      const saved=existing.response as Record<string,unknown>|null;
      if(saved?.fingerprint!==fingerprint)return apiError('IDEMPOTENCY_CONFLICT','Kunci permintaan telah digunakan untuk data berbeda. Muat ulang checkout.',409);
      if(typeof saved?.publicId==='string')return NextResponse.json({ok:true,publicId:saved.publicId,status:saved.status,recovered:true},{status:200});
      return apiError('REQUEST_IN_PROGRESS','Pesanan sedang diproses. Silakan coba lagi.',409);
    }
    const result=await db.$transaction(async tx=>{
      await tx.idempotencyKey.create({data:{scope,key,expiresAt:new Date(Date.now()+86_400_000)}});
      const [service,area,settings]=await Promise.all([
        tx.service.findUnique({where:{id:data.serviceId},include:{serviceAreas:true,category:true}}),
        tx.area.findUnique({where:{id:data.areaId}}),
        tx.setting.findUnique({where:{key:'business'}})
      ]);
      if(!service||!service.active||service.archivedAt||!service.category.active||service.category.archivedAt)throw new Error('SERVICE_UNAVAILABLE');
      if(!area||!area.active)throw new Error('AREA_UNAVAILABLE');
      if(service.serviceAreas.length&&!service.serviceAreas.some(x=>x.areaId===data.areaId&&x.active))throw new Error('SERVICE_NOT_AVAILABLE_IN_AREA');
      const business=settings?.value&&typeof settings.value==='object'&&!Array.isArray(settings.value)?settings.value as Record<string,unknown>:{};
      const lead=Math.max(0,Number(business.minSchedulingLeadMinutes||0));
      if(data.scheduledAt.getTime()<Date.now()+lead*60_000)throw new Error('SCHEDULE_TOO_SOON');
      const ps=await tx.partnerService.findFirst({where:{partnerId:data.partnerId,serviceId:service.id,active:true,partner:{user:{active:true},online:true,dispatchEnabled:true,status:{notIn:['REJECTED','SUSPENDED']},storefrontStatus:{not:'HIDDEN'},areas:{some:{areaId:data.areaId}}}},select:{partnerId:true,customPrice:true,partner:{select:{userId:true}}}});
      if(!ps)throw new Error('PARTNER_UNAVAILABLE');
      const selectedPartner={id:ps.partnerId,userId:ps.partner.userId,price:ps.customPrice??service.basePrice};
      const unitPrice=selectedPartner.price,serviceSubtotal=calculateLineTotal({unitPrice,quantity:data.quantity,minimumCharge:service.minimumCharge}),areaSurcharge=area.surcharge,total=serviceSubtotal+areaSurcharge;
      if(!Number.isSafeInteger(total)||total<0)throw new Error('INVALID_TOTAL');
      if(total!==data.expectedTotal)throw new Error('PRICE_CHANGED');
      const bps=service.commissionBps??Number(business.defaultCommissionBps||1000),fee=commission(total,bps);
      // Anonymous checkout always receives an isolated customer identity. A phone number
      // is contact data, never proof of account ownership.
      const isNewUser=!authenticated;
      let customer;
      if(authenticated){
        customer=await tx.customerProfile.findUnique({where:{id:authenticated.customer.id}});
        if(!customer)throw new Error('CUSTOMER_UNAVAILABLE');
      }else{
        const guestUser=await tx.user.create({data:{role:'CUSTOMER'}});
        customer=await tx.customerProfile.create({data:{userId:guestUser.id,name:data.name}});
      }
      await tx.address.create({data:{customerId:customer.id,recipientName:data.name,phone:data.phone,line1:data.address,areaId:data.areaId,latitude:data.latitude,longitude:data.longitude}});
      const today=new Date();today.setHours(0,0,0,0);const count=await tx.order.count({where:{createdAt:{gte:today}}});
      let pid=publicOrderId(count+1);for(let attempt=0;attempt<20&&await tx.order.findUnique({where:{publicId:pid},select:{id:true}});attempt++)pid=publicOrderId(count+2+attempt);
      const order=await tx.order.create({data:{publicId:pid,customerId:customer.id,partnerId:selectedPartner.id,areaId:data.areaId,status:'NEW',scheduledAt:data.scheduledAt,addressSnapshot:{line1:data.address,recipientName:data.name,contactPhone:data.phone,area:area.name,latitude:data.latitude??null,longitude:data.longitude??null},customerNote:data.note||undefined,latitude:data.latitude,longitude:data.longitude,locationNote:data.locationNote||undefined,paymentMethod:data.paymentMethod,subtotal:serviceSubtotal,areaSurcharge,total,commission:fee,partnerEarning:total-fee,items:{create:{serviceId:service.id,name:service.name,quantity:data.quantity,unitPrice,lineTotal:serviceSubtotal}},history:{create:[{actorRole:'CUSTOMER',newStatus:'NEW'}]},thread:{create:{}}}});
      await tx.notification.create({data:{userId:selectedPartner.userId,type:'ORDER_NEW',channel:'DASHBOARD',payload:{orderId:order.id,publicId:order.publicId,status:order.status}}});
      const response={ok:true,id:order.id,publicId:order.publicId,status:order.status,sessionEstablished:isNewUser,fingerprint};
      await tx.idempotencyKey.update({where:{scope_key:{scope,key}},data:{response,statusCode:201}});
      return response;
    });
    if(result.sessionEstablished){try{await establishSession(result.publicId)}catch(e){console.error('GUEST_SESSION_ESTABLISH_FAILED',{code:e instanceof Error?e.name:'UNKNOWN'});return apiError('SESSION_ESTABLISH_FAILED','Pesanan tercatat tetapi sesi akses gagal disiapkan. Gunakan perangkat yang sama dan hubungi bantuan dengan nomor pesanan.',503)}}
    return NextResponse.json(result,{status:201});
  }catch(e){
    const code=e instanceof Error?e.message:'UNKNOWN';
    if(code==='PRICE_CHANGED')return apiError('PRICE_CHANGED','Harga berubah. Muat ulang checkout dan konfirmasi harga terbaru sebelum memesan.',409);
    if(businessMessages[code])return apiError(code,businessMessages[code],409);
    if(e instanceof Prisma.PrismaClientKnownRequestError&&e.code==='P2002')return apiError('DUPLICATE_REQUEST','Pesanan yang sama sedang diproses. Silakan tunggu sebentar.',409);
    console.error('create order failed',{code});
    return apiError('ORDER_CREATE_FAILED','Pesanan belum berhasil dibuat. Silakan coba lagi.',500);
  }
}
