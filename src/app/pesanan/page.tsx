import Link from 'next/link';
import {Search,CalendarDays,Store} from 'lucide-react';
import {requireCustomer} from '@/lib/customer-auth';
import {db} from '@/lib/db';
import {CustomerShell} from '@/components/CustomerShell';
import {rupiah} from '@/lib/money';
import {activeOrderStatuses,customerStatusLabel,statusTone} from '@/lib/customer-ui';
import type {Prisma} from '@prisma/client';

export const dynamic='force-dynamic';export const metadata={title:'Pesanan Saya | JasaBatam',robots:{index:false,follow:false}};
export default async function Page({searchParams}:{searchParams:Promise<{filter?:string;q?:string;page?:string}>}){
  const auth=await requireCustomer('/pesanan'),sp=await searchParams;const filter=sp.filter||'all',query=(sp.q||'').trim(),page=Math.max(1,Number.parseInt(sp.page||'1',10)||1),pageSize=20;
  const where:Prisma.OrderWhereInput={customerId:auth.customer.id};
  if(filter==='active')where.status={in:activeOrderStatuses};else if(filter==='completed')where.status='COMPLETED';else if(filter==='cancelled')where.status={in:['CANCELLED','REFUNDED']};
  if(query)where.OR=[{publicId:{contains:query,mode:'insensitive'}},{partner:{businessName:{contains:query,mode:'insensitive'}}}];
  const [orders,counts,filteredCount]=await Promise.all([
    db.order.findMany({where,orderBy:{createdAt:'desc'},skip:(page-1)*pageSize,take:pageSize,include:{partner:{select:{businessName:true,media:{where:{hidden:false,kind:{in:['LOGO','PROFILE']}},orderBy:{sortOrder:'asc'},take:1,select:{url:true}}}},items:{take:2,select:{name:true}},}}),
    Promise.all([db.order.count({where:{customerId:auth.customer.id}}),db.order.count({where:{customerId:auth.customer.id,status:{in:activeOrderStatuses}}}),db.order.count({where:{customerId:auth.customer.id,status:'COMPLETED'}}),db.order.count({where:{customerId:auth.customer.id,status:{in:['CANCELLED','REFUNDED']}}})]),
    db.order.count({where})
  ]);
  const pages=Math.max(1,Math.ceil(filteredCount/pageSize));
  const tabs=[['all','Semua',counts[0]],['active','Aktif',counts[1]],['completed','Selesai',counts[2]],['cancelled','Dibatalkan',counts[3]]] as const;
  return <CustomerShell name={auth.customer.name} phone={auth.user.phone}><div className="customer-title"><h1>Pesanan Saya</h1><p>Pantau semua pesanan aktif dan riwayat Anda.</p></div><div className="orders-tools"><div className="orders-tabs">{tabs.map(([key,label,n])=><Link className={filter===key?'active':''} key={key} href={`/pesanan?filter=${key}${query?`&q=${encodeURIComponent(query)}`:''}`}>{label} <span>({n})</span></Link>)}</div><form className="orders-search"><Search size={18}/><input name="q" defaultValue={query} placeholder="Cari nomor order atau nama mitra..."/><input type="hidden" name="filter" value={filter}/></form></div><div className="orders-list">{orders.map(o=>{const logo=o.partner?.media[0]?.url;return <article className="order-card card" key={o.id}><div className="order-partner-logo">{logo?<img src={logo} alt=""/>:<Store/>}</div><div className="order-card-main"><div className="order-card-head"><div><h2>{o.partner?.businessName||'Mitra belum ditetapkan'}</h2><p>{o.items.map(i=>i.name).join(', ')||'Layanan'}</p></div><span className={`customer-badge ${statusTone(o.status)}`}>{customerStatusLabel[o.status]}</span></div><b className="order-public">#{o.publicId}</b><span className="order-time"><CalendarDays size={14}/>{o.scheduledAt.toLocaleString('id-ID',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Jakarta'})}</span><div className="order-card-foot"><div><small>Total</small><b>{rupiah(o.total)}</b></div><Link className="btn order-detail-button" href={`/pesanan/${o.publicId}`}>Lihat Detail ›</Link></div></div></article>})}{!orders.length&&<div className="card customer-empty"><ClipboardEmpty/><h2>Belum ada pesanan</h2><p>Pesanan Anda akan tampil di sini setelah checkout berhasil.</p><Link className="btn primary" href="/jasa">Cari Jasa</Link></div>}</div>{filteredCount>pageSize&&<nav className="customer-pagination" aria-label="Navigasi halaman pesanan"><Link className={page<=1?'disabled':''} href={`/pesanan?filter=${filter}&q=${encodeURIComponent(query)}&page=${Math.max(1,page-1)}`}>‹ Sebelumnya</Link><span>Halaman {Math.min(page,pages)} dari {pages}</span><Link className={page>=pages?'disabled':''} href={`/pesanan?filter=${filter}&q=${encodeURIComponent(query)}&page=${Math.min(pages,page+1)}`}>Berikutnya ›</Link></nav>}</CustomerShell>
}
function ClipboardEmpty(){return <div className="empty-icon">✓</div>}
