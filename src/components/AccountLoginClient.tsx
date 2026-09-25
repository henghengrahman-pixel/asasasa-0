'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {MessageCircleMore,ShieldCheck} from 'lucide-react';
export function AccountLoginClient({next}:{next?:string}){
  const router=useRouter();const [phone,setPhone]=useState('');const [error,setError]=useState('');const [busy,setBusy]=useState(false);
  async function submit(e:React.FormEvent){e.preventDefault();if(busy)return;setBusy(true);setError('');try{const res=await fetch('/api/customer/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({phone})});const j=await res.json().catch(()=>({}));if(!res.ok){setError(j.message||'Tidak dapat masuk.');return}router.replace(next||'/akun');router.refresh()}catch{setError('Koneksi bermasalah. Silakan coba lagi.')}finally{setBusy(false)}}
  return <form className="account-login-form" onSubmit={submit}><label>Nomor WhatsApp<div className="phone-field"><span>+62</span><input value={phone} onChange={e=>setPhone(e.target.value)} inputMode="tel" autoComplete="tel" placeholder="81234567890" aria-label="Nomor WhatsApp"/><MessageCircleMore size={20}/></div></label>{error&&<div className="account-error" role="alert">{error}</div>}<button className="btn primary account-primary" disabled={busy}>{busy?'Memeriksa...':'Masuk & Lihat Pesanan'}</button><div className="account-security"><ShieldCheck size={18}/><span><b>Tidak perlu password</b><small>Akses hanya dipulihkan pada perangkat yang pernah terverifikasi saat pemesanan.</small></span></div></form>
}
