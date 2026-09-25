import type {OrderStatus} from '@prisma/client';
export const customerStatusLabel:Record<OrderStatus,string>={NEW:'Pesanan Dibuat',SEARCHING_PARTNER:'Mencari Mitra',OFFERED:'Menunggu Konfirmasi Mitra',ACCEPTED:'Pesanan Diterima',ON_THE_WAY:'Mitra Menuju Lokasi',ARRIVED:'Mitra Tiba',IN_PROGRESS:'Sedang Dikerjakan',COMPLETED:'Selesai',CANCELLED:'Dibatalkan',DISPUTED:'Dalam Penanganan',REFUND_PENDING:'Refund Diproses',REFUNDED:'Refund Selesai'};
export const activeOrderStatuses:OrderStatus[]=['NEW','SEARCHING_PARTNER','OFFERED','ACCEPTED','ON_THE_WAY','ARRIVED','IN_PROGRESS','DISPUTED','REFUND_PENDING'];
export const completedTransactionStatuses:OrderStatus[]=['COMPLETED'];
export function canCustomerCancel(status:OrderStatus){return ['NEW','SEARCHING_PARTNER','OFFERED'].includes(status)}
export function statusTone(status:OrderStatus){if(status==='COMPLETED'||status==='REFUNDED')return 'success';if(status==='CANCELLED')return 'danger';if(status==='IN_PROGRESS'||status==='ACCEPTED'||status==='ON_THE_WAY'||status==='ARRIVED')return 'warning';return 'info'}
