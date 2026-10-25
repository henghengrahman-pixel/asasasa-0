export function sanitizeChatBody(value:unknown):string{
  if(typeof value!=='string')throw new Error('MESSAGE_INVALID');
  const clean=value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g,'').trim();
  if(!clean||clean.length>2000)throw new Error('MESSAGE_INVALID');
  return clean;
}
export function chatPreview(value:string|null|undefined){const text=(value||'').replace(/\s+/g,' ').trim();return text.length>70?`${text.slice(0,67)}…`:text}
