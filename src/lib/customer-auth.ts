import {SignJWT,jwtVerify} from 'jose';
import {cookies} from 'next/headers';
import {redirect} from 'next/navigation';
import {db} from './db';
import {getPublicEnv,getSessionSecret} from './runtime-env';
import {normalizeIndonesianPhone} from './phone';
import {isValidCustomerSession} from './customer-session-policy';

const SESSION_COOKIE='jb_customer_session';
const DEVICE_COOKIE='jb_customer_device';
const key=()=>new TextEncoder().encode(getSessionSecret());
type CustomerSessionBase={userId:string;customerId:string;sessionVersion:number};
export type CustomerSession=CustomerSessionBase&{kind:'customer'};
type TrustedDevice=CustomerSessionBase&{kind:'device'};
const secure=()=>getPublicEnv().NODE_ENV==='production';
async function token(payload:CustomerSession|TrustedDevice,ttl:string){return new SignJWT(payload).setProtectedHeader({alg:'HS256'}).setIssuedAt().setExpirationTime(ttl).sign(key())}

export async function createCustomerSession(s:Omit<CustomerSession,'kind'>,{rememberDevice=true}:{rememberDevice?:boolean}={}){
  const jar=await cookies();
  jar.set(SESSION_COOKIE,await token({...s,kind:'customer'},'7d'),{httpOnly:true,secure:secure(),sameSite:'lax',path:'/',maxAge:604800});
  if(rememberDevice)jar.set(DEVICE_COOKIE,await token({...s,kind:'device'},'180d'),{httpOnly:true,secure:secure(),sameSite:'lax',path:'/',maxAge:15552000});
}
export async function clearCustomerSession({forgetDevice=false}:{forgetDevice?:boolean}={}){
  const jar=await cookies();
  jar.set(SESSION_COOKIE,'',{httpOnly:true,secure:secure(),sameSite:'lax',path:'/',maxAge:0});
  if(forgetDevice)jar.set(DEVICE_COOKIE,'',{httpOnly:true,secure:secure(),sameSite:'lax',path:'/',maxAge:0});
}
async function verifyCustomerPayload(raw:string|undefined,expected:'customer'|'device'){
  if(!raw)return null;
  try{
    const p=(await jwtVerify(raw,key())).payload as unknown as CustomerSession|TrustedDevice;
    if(p.kind!==expected||!p.userId||!p.customerId||!Number.isInteger(p.sessionVersion))return null;
    const user=await db.user.findUnique({where:{id:p.userId},include:{customer:true}});
    if(!isValidCustomerSession(p,user)||!user?.customer)return null;
    return {session:p,user,customer:user.customer};
  }catch{return null}
}
export async function currentCustomer(){const jar=await cookies();return verifyCustomerPayload(jar.get(SESSION_COOKIE)?.value,'customer')}
export async function requireCustomer(next?:string){const c=await currentCustomer();if(!c)redirect(`/akun?mode=login${next?`&next=${encodeURIComponent(next)}`:''}`);return c}
export async function recoverCustomerOnTrustedDevice(phone:string){
  const canonical=normalizeIndonesianPhone(phone),jar=await cookies();
  const trusted=await verifyCustomerPayload(jar.get(DEVICE_COOKIE)?.value,'device');
  if(!trusted)return {ok:false as const,code:'UNTRUSTED_DEVICE'};
  const stored=trusted.user.phone?normalizeIndonesianPhone(trusted.user.phone):'';
  if(stored!==canonical)return {ok:false as const,code:'PHONE_MISMATCH'};
  await createCustomerSession({userId:trusted.user.id,customerId:trusted.customer.id,sessionVersion:trusted.user.sessionVersion},{rememberDevice:false});
  return {ok:true as const,customer:trusted.customer};
}
