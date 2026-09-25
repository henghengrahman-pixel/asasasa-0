# JasaBatam Customer Experience Revision Report

## Root cause
The customer-facing `/akun`, `/pesanan`, and `/chat` routes were placeholders. Existing checkout created the customer/order/thread data, but there was no separate secure customer session, no customer-owned order list, and no customer/partner chat API/UI.

## Implemented customer flow
- First order: checkout normalizes WhatsApp number, reuses/creates CUSTOMER User + CustomerProfile, stores an address when new, creates the existing Order/OrderItem/OrderStatusHistory/ChatThread flow, then issues a customer session and trusted-device cookie.
- Returning customer: active customer session opens the dashboard immediately. If the short session expired, the phone login can restore it only when the signed trusted-device cookie from a prior checkout is present. Phone number alone never authorizes a new browser.
- Customer data is loaded from PostgreSQL through Prisma; visual mockup values are not hardcoded.

## Session security
- Cookie: `jb_customer_session`, HTTP-only, SameSite=Lax, Secure in production.
- Trusted device: `jb_customer_device`, signed and tied to userId/customerId/sessionVersion.
- Server revalidates active CUSTOMER role and sessionVersion.
- Customer, partner, and admin sessions remain separate.
- Mutation routes use the existing same-origin/CSRF origin validation helper.

## Orders and tracking
- `/pesanan` now loads only the authenticated customer's orders, with filters, search, status badges, real partner/service/total/schedule data, and server-side pagination.
- `/pesanan/[id]` scopes by authenticated customerId and publicId.
- Timeline is rendered from `OrderStatusHistory`.
- Cost summary is rendered from Order subtotal/discount/paymentFee/areaSurcharge/total and OrderItem values.
- Customer cancellation is allowed only for NEW / SEARCHING_PARTNER / OFFERED and writes OrderStatusHistory.

## Chat
- Reuses the single `ChatThread` already created per Order.
- Customer APIs scope by `order.customerId` from the authenticated session.
- Partner APIs scope by `order.partnerId` from the authenticated partner session.
- Plain-text messages only, 1–2000 characters, control characters removed, React escaping retained.
- Latest 50 messages are loaded, older messages use cursor pagination, and new messages use incremental 3-second non-overlapping polling with AbortController cleanup and de-duplication.
- Read state is stored in `ChatReadCursor` using the new production-safe migration `202609250001_customer_chat_read`.

## UI
- Added account first-order state, secure returning-customer state, member dashboard, desktop customer sidebar, mobile stacked dashboard, order list, two-column order detail, mobile order detail, two-pane desktop chat, full-screen mobile chat, customer/partner message bubbles, and mobile bottom navigation integration.
- CSS audit reports zero same-context duplicate selectors.

## Verification actually completed
- `node scripts/audit-project.mjs` — PASS.
- `node scripts/audit-css.mjs` — PASS (329 selectors, 0 same-context duplicates).
- `node scripts/integrity.mjs` — PASS.
- TypeScript/TSX syntax transpile over `src` + `tests` using the installed TypeScript compiler — PASS, 0 syntax diagnostics.
- Local import resolution audit — PASS.
- Placeholder/fake mockup value audit for customer pages — PASS.
- `@ts-ignore` / `@ts-nocheck` audit for changed customer code — PASS.

## Verification blocker in supplied ZIP / execution environment
The supplied ZIP did not contain `package-lock.json` and did not contain `node_modules`. This environment has no npm registry/network access. Therefore a valid lockfile cannot be generated here without fabricating dependency metadata.

Actual requested command results:
- `npm ci` — FAIL before install: package-lock.json/npm-shrinkwrap.json is missing.
- `npx prisma validate` — NOT COMPLETED: Prisma is not installed locally; `npx` attempted package resolution and timed out because registry access is unavailable.
- `npm run typecheck` — BLOCKED by missing installed dependencies/types (Next, React, Prisma Client, Node types, Vitest, Playwright, etc.).
- `npm run lint` — BLOCKED: eslint binary not installed locally.
- `npm test` — BLOCKED: vitest binary not installed locally.
- `npm run build` — BLOCKED: prisma/next binaries not installed locally.
- Docker — NOT RUN: Docker CLI unavailable.
- Runtime DB smoke — NOT RUN: no disposable TEST_DATABASE_URL was supplied.
- Playwright — NOT RUN: Playwright dependency/browser is not installed locally.

These blocked gates are not reported as PASS.
