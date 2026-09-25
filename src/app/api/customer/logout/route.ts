import {isTrustedMutationOrigin} from '@/lib/request-security';
import {NextRequest,NextResponse} from 'next/server';import {clearCustomerSession} from '@/lib/customer-auth';
export async function POST(req:NextRequest){if(!isTrustedMutationOrigin(req))return NextResponse.json({ok:false,message:'Permintaan tidak diizinkan.'},{status:403});await clearCustomerSession();return NextResponse.redirect(new URL('/akun',req.url),303)}
