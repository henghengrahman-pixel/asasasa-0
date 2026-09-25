import Link from 'next/link';
import type {ReactNode} from 'react';
import {Home,ClipboardList,MessageCircle,MapPin,Star,LifeBuoy,LogOut,UserRound} from 'lucide-react';
import {Header} from '@/components/Header';
import {maskPhone} from '@/lib/phone';

const links=[
  [Home,'Beranda','/akun'],[ClipboardList,'Pesanan Saya','/pesanan'],[MessageCircle,'Chat','/chat'],[MapPin,'Alamat Saya','/akun#alamat'],[Star,'Ulasan Saya','/akun#ulasan'],[LifeBuoy,'Bantuan','/akun#bantuan']
] as const;
export function CustomerShell({name,phone,children}:{name:string;phone:string|null;children:ReactNode}){
  return <><Header/><main className="customer-page"><div className="customer-shell container"><aside className="customer-sidebar card"><div className="customer-identity"><span className="customer-avatar"><UserRound/></span><div><small>Halo,</small><b>{name}</b><span>{maskPhone(phone)}</span><em>Member JasaBatam</em></div></div><nav>{links.map(([Icon,label,href])=><Link key={href} href={href}><Icon size={18}/><span>{label}</span></Link>)}</nav><form action="/api/customer/logout" method="post"><button className="customer-logout" type="submit"><LogOut size={18}/> Keluar</button></form></aside><section className="customer-main">{children}</section></div></main></>
}
