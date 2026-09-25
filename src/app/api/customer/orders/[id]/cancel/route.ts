import {isTrustedMutationOrigin} from '@/lib/request-security';
import {NextRequest,NextResponse} from 'next/server';
import {db} from '@/lib/db';
import {currentCustomer} from '@/lib/customer-auth';
import {canCustomerCancel} from '@/lib/customer-ui';
export async function POST(req:NextRequest,{params}:{params:Promise<{id:string}>}){if(!isTrustedMutationOrigin(req))return NextResponse.json({ok:false,message:'Permintaan tidak diizinkan.'},{status:403});
  const auth=await currentCustomer();if(!auth)return NextResponse.json({ok:false,message:'Sesi customer diperlukan.'},{status:401});
  const {id}=await params;const order=await db.order.findFirst({where:{publicId:id,customerId:auth.customer.id},select:{id:true,status:true}});
  if(!order)return NextResponse.json({ok:false,message:'Pesanan tidak ditemukan.'},{status:404});
  if(!canCustomerCancel(order.status))return NextResponse.json({ok:false,message:'Pesanan pada status ini tidak dapat dibatalkan.'},{status:409});
  await db.$transaction([db.order.update({where:{id:order.id},data:{status:'CANCELLED'}}),db.orderStatusHistory.create({data:{orderId:order.id,actorUserId:auth.user.id,actorRole:'CUSTOMER',previousStatus:order.status,newStatus:'CANCELLED',reason:'Dibatalkan customer'}})]);
  return NextResponse.redirect(new URL(`/pesanan/${id}`,req.url),303);
}
