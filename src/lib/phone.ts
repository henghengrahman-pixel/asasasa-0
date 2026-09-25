export function normalizeIndonesianPhone(value:string):string{
  const digits=value.replace(/\D/g,'');
  if(!digits)throw new Error('PHONE_REQUIRED');
  let canonical=digits;
  if(canonical.startsWith('0'))canonical=`62${canonical.slice(1)}`;
  else if(canonical.startsWith('8'))canonical=`62${canonical}`;
  if(!/^628[0-9]{7,12}$/.test(canonical))throw new Error('PHONE_INVALID');
  return canonical;
}
export function phoneAliases(value:string):string[]{
  const canonical=normalizeIndonesianPhone(value);
  const local=`0${canonical.slice(2)}`;
  return [...new Set([canonical,`+${canonical}`,local])];
}
export function maskPhone(value:string|null|undefined):string{
  if(!value)return '-';
  const d=value.replace(/\D/g,'');
  if(d.length<8)return d;
  return `${d.slice(0,4)} ${'•'.repeat(Math.max(4,d.length-7))} ${d.slice(-3)}`;
}
