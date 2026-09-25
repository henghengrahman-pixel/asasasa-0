import {Header} from '@/components/Header';import {ChatClient} from '@/components/ChatClient';import {requireCustomer} from '@/lib/customer-auth';
export const dynamic='force-dynamic';export const metadata={title:'Chat | JasaBatam',robots:{index:false,follow:false}};
export default async function Page({searchParams}:{searchParams:Promise<{order?:string}>}){await requireCustomer('/chat');const {order}=await searchParams;return <><Header/><main className="chat-page"><div className="container"><ChatClient baseApi="/api/customer/chat" myRole="CUSTOMER" initialOrder={order}/></div></main></>}
