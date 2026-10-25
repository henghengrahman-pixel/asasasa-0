import {NextRequest,NextResponse} from 'next/server';
import {z} from 'zod';
import {normalizeIndonesianPhone} from '@/lib/phone';
import {recoverCustomerOnTrustedDevice} from '@/lib/customer-auth';
import {isTrustedMutationOrigin} from '@/lib/request-security';
const schema=z.object({phone:z.string().min(8).max(30)});
export async function POST(req:NextRequest){
  if(!isTrustedMutationOrigin(req))return NextResponse.json({ok:false,message:'Permintaan tidak diizinkan.'},{status:403});
  const body=await req.json().catch(()=>null),parsed=schema.safeParse(body);if(!parsed.success)return NextResponse.json({ok:false,message:'Masukkan nomor WhatsApp yang valid.'},{status:400});
  let canonical:string;try{canonical=normalizeIndonesianPhone(parsed.data.phone)}catch{return NextResponse.json({ok:false,message:'Masukkan nomor WhatsApp yang valid.'},{status:400})}
  const recovered=await recoverCustomerOnTrustedDevice(canonical);
  if(!recovered.ok)return NextResponse.json({ok:false,code:'RECOVERY_REQUIRED',message:'Akses pesanan belum dapat dipulihkan di perangkat ini. Jika Anda pernah memesan, gunakan perangkat yang dipakai saat checkout. Jika belum pernah memesan, silakan buat pesanan terlebih dahulu.'},{status:403});
  return NextResponse.json({ok:true});
}
