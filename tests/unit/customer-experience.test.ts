import {describe,expect,it} from 'vitest';
import {normalizeIndonesianPhone,phoneAliases,maskPhone} from '@/lib/phone';
import {canCustomerCancel,customerStatusLabel,statusTone} from '@/lib/customer-ui';
import {sanitizeChatBody,chatPreview} from '@/lib/chat';
import {isValidCustomerSession} from '@/lib/customer-session-policy';

describe('customer phone normalization',()=>{
  it('normalizes local, +62 and 62 formats to one canonical value',()=>{
    expect(normalizeIndonesianPhone('0812 3456 789')).toBe('628123456789');
    expect(normalizeIndonesianPhone('+62 812-3456-789')).toBe('628123456789');
    expect(normalizeIndonesianPhone('628123456789')).toBe('628123456789');
  });
  it('rejects invalid phone values',()=>{expect(()=>normalizeIndonesianPhone('123')).toThrow('PHONE_INVALID')});
  it('provides aliases to reuse legacy customer records',()=>expect(phoneAliases('08123456789')).toEqual(['628123456789','+628123456789','08123456789']));
  it('masks phone for the account sidebar',()=>expect(maskPhone('628123456789')).not.toContain('3456'));
});

describe('customer order status presentation',()=>{
  it('uses customer-facing Indonesian labels',()=>{expect(customerStatusLabel.IN_PROGRESS).toBe('Sedang Dikerjakan');expect(customerStatusLabel.REFUNDED).toBe('Refund Selesai')});
  it('allows cancellation only before partner acceptance',()=>{expect(canCustomerCancel('NEW')).toBe(true);expect(canCustomerCancel('OFFERED')).toBe(true);expect(canCustomerCancel('ACCEPTED')).toBe(false);expect(canCustomerCancel('COMPLETED')).toBe(false)});
  it('uses semantic status tones',()=>{expect(statusTone('COMPLETED')).toBe('success');expect(statusTone('CANCELLED')).toBe('danger')});
});

describe('chat message safety',()=>{
  it('trims text and strips unsafe control characters while preserving plain text',()=>expect(sanitizeChatBody('  halo\u0000 bos  ')).toBe('halo bos'));
  it('rejects empty and oversized messages',()=>{expect(()=>sanitizeChatBody('   ')).toThrow('MESSAGE_INVALID');expect(()=>sanitizeChatBody('x'.repeat(2001))).toThrow('MESSAGE_INVALID')});
  it('builds a bounded conversation preview',()=>expect(chatPreview('x'.repeat(100))).toHaveLength(68));
});


describe('customer session policy',()=>{
  const identity={userId:'u1',customerId:'c1',sessionVersion:3};
  const valid={id:'u1',active:true,role:'CUSTOMER',sessionVersion:3,customer:{id:'c1'}};
  it('accepts only the matching active customer session',()=>expect(isValidCustomerSession(identity,valid)).toBe(true));
  it('invalidates stale version, inactive user, wrong role and wrong customer',()=>{
    expect(isValidCustomerSession(identity,{...valid,sessionVersion:4})).toBe(false);
    expect(isValidCustomerSession(identity,{...valid,active:false})).toBe(false);
    expect(isValidCustomerSession(identity,{...valid,role:'PARTNER'})).toBe(false);
    expect(isValidCustomerSession(identity,{...valid,customer:{id:'c2'}})).toBe(false);
  });
});
