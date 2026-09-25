export type CustomerSessionIdentity={userId:string;customerId:string;sessionVersion:number};
export type CustomerUserRecord={id:string;active:boolean;role:string;sessionVersion:number;customer:{id:string}|null};
export function isValidCustomerSession(identity:CustomerSessionIdentity,user:CustomerUserRecord|null){
  return Boolean(user&&user.id===identity.userId&&user.active&&user.role==='CUSTOMER'&&user.sessionVersion===identity.sessionVersion&&user.customer?.id===identity.customerId);
}
