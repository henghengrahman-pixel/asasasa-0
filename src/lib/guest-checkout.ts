import {createHmac,randomBytes,timingSafeEqual} from 'node:crypto';
import {getSessionSecret} from './runtime-env';
export const GUEST_COOKIE='jb_guest_checkout';
const mac=(data:string)=>createHmac('sha256',getSessionSecret()).update(`guest-checkout:${data}`).digest('base64url');
export function newGuestCheckout(){const id=randomBytes(32).toString('base64url');const expires=Math.floor(Date.now()/1000)+7*24*3600;const data=`${id}.${expires}`;return `${data}.${mac(data)}`}
export function parseGuestCheckout(value:string|undefined){
 if(!value)return null;
 const chunks=value.split('.');
 if(chunks.length!==3||! /^[A-Za-z0-9_-]{43}$/.test(chunks[0])||!/^[0-9]{10}$/.test(chunks[1]))return null;
 const expires=Number(chunks[1]);
 if(expires<=Math.floor(Date.now()/1000)||expires>Math.floor(Date.now()/1000)+7*24*3600+60)return null;
 const wanted=Buffer.from(mac(`${chunks[0]}.${chunks[1]}`));const given=Buffer.from(chunks[2]);
 return wanted.length===given.length&&timingSafeEqual(wanted,given)?chunks[0]:null;
}
