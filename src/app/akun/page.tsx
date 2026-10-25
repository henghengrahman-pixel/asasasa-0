import Link from 'next/link';
import {ShoppingBag,CheckCircle2,ClipboardList,MessageCircle,MapPin,Star,LifeBuoy,Phone,Home} from 'lucide-react';
import {Header} from '@/components/Header';
import {AccountLoginClient} from '@/components/AccountLoginClient';
import {CustomerShell} from '@/components/CustomerShell';
import {currentCustomer} from '@/lib/customer-auth';
import {db} from '@/lib/db';
import {rupiah} from '@/lib/money';
import {activeOrderStatuses,completedTransactionStatuses} from '@/lib/customer-ui';

export const dynamic='force-dynamic';
export const metadata={title:'Akun Saya | JasaBatam',robots:{index:false,follow:false}};
function AccountArt(){return <div className="account-art"><span><Home size={28}/></span><ShoppingBag size={62}/></div>}
export default async function Page({searchParams}:{searchParams:Promise<{mode?:string;next?:string}>}){
  const q=await searchParams,c=await currentCustomer();
  if(c){
    const [active,completed,totalAgg,address,reviews]=await Promise.all([
      db.order.count({where:{customerId:c.customer.id,status:{in:activeOrderStatuses}}}),
      db.order.count({where:{customerId:c.customer.id,status:'COMPLETED'}}),
      db.order.aggregate({where:{customerId:c.customer.id,status:{in:completedTransactionStatuses}},_sum:{total:true}}),
      db.address.findFirst({where:{customerId:c.customer.id},orderBy:{createdAt:'desc'},include:{area:true}}),
      db.review.count({where:{customerId:c.customer.id}})
    ]);
    const quick=[[ClipboardList,'Pesanan Saya','/pesanan'],[MessageCircle,'Chat','/chat'],[MapPin,'Alamat Saya','#alamat'],[Star,'Ulasan Saya','#ulasan'],[LifeBuoy,'Bantuan','#bantuan']] as const;
    return <CustomerShell name={c.customer.name} phone={c.user.phone}><div className="customer-title"><h1>Akun Saya</h1><p>Kelola informasi dan lihat riwayat aktivitas Anda.</p></div><div className="customer-summary"><div><span>Pesanan Aktif</span><b>{active}</b></div><div><span>Pesanan Selesai</span><b>{completed}</b></div><div><span>Total Transaksi</span><b>{rupiah(totalAgg._sum.total||0)}</b></div></div><section className="customer-panel card"><h2>Informasi Akun</h2><div className="customer-info-row"><Phone/><div><small>Nomor WhatsApp</small><b>{c.user.phone||'-'}</b></div></div><div className="customer-info-row" id="alamat"><MapPin/><div><small>Alamat Utama</small>{address?<><b>{address.line1}</b><span>{address.area.name}, Batam</span></>:<b>Belum ada alamat tersimpan.</b>}</div></div></section><section className="customer-panel"><h2>Menu Cepat</h2><div className="customer-quick-grid">{quick.map(([Icon,label,href])=><Link href={href} className="card" key={label}><Icon/><span>{label}</span></Link>)}</div></section><section id="ulasan" className="customer-panel card"><h2>Ulasan Saya</h2><p className="muted">{reviews?`${reviews} ulasan telah Anda berikan.`:'Belum ada ulasan.'}</p></section><section id="bantuan" className="customer-panel card"><h2>Bantuan</h2><p className="muted">Butuh bantuan mengenai pesanan? Buka detail pesanan lalu pilih Hubungi Bantuan.</p></section></CustomerShell>
  }
  const login=q.mode==='login';
  return <><Header/><main className="account-guest-page"><div className="account-guest-card card"><AccountArt/>{login?<><h1>Masuk untuk melihat pesanan Anda</h1><p>Gunakan nomor WhatsApp yang sama dengan nomor saat melakukan pemesanan.</p><AccountLoginClient next={q.next}/><Link className="account-switch" href="/akun">← Belum pernah pesan?</Link></>:<><h1>Belum memiliki akun JasaBatam</h1><p>Silakan melakukan pemesanan terlebih dahulu. Setelah pesanan dibuat, akun Anda akan otomatis terhubung dengan nomor WhatsApp yang digunakan saat checkout.</p><div className="account-benefits"><b>Setelah melakukan pemesanan, Anda dapat:</b>{['Tracking pesanan dengan mudah','Melihat riwayat pesanan','Melihat rincian biaya','Chat langsung dengan mitra'].map(x=><span key={x}><CheckCircle2/> {x}</span>)}</div><Link className="btn primary account-primary" href="/jasa">Pesan Jasa Sekarang <span>›</span></Link><div className="account-secondary"><span>Sudah pernah pesan?</span><Link href="/akun?mode=login">Masuk untuk Tracking Pesanan →</Link></div></>}</div></main></>
}
