# JasaBatam

Production Next.js marketplace for customer, partner, and admin workflows.

## Local verification

1. Copy `.env.example` to `.env` and configure a non-production PostgreSQL database.
2. Install dependencies.
3. Run `npx prisma migrate deploy` and `npx prisma generate`.
4. Run `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build`.
5. For browser tests, run `npm run test:e2e` against a disposable test database.

## Customer authentication

Customer sessions are separate from admin and partner sessions. Checkout creates a secure `jb_customer_session` and a signed trusted-device token. A phone number by itself does not authorize access from a new browser. Customer order and chat routes always scope database queries to the authenticated customer. Partner chat routes always scope queries to the authenticated partner.

## Customer chat

Each order reuses its existing `ChatThread`. Messages are stored as plain text, paginated, and polled incrementally. Read state is stored in `ChatReadCursor` via migration `202609250001_customer_chat_read`.
