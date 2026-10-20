# Owner setup and launch checklist

## What you own
- Product name: DocuMint (check trademark and domain availability before public launch).
- Source code: this repository folder and its GitHub repository once you create it under your account.
- Hosting: create the Render service using your own account so billing, deployment and access stay under your control.
- Domain: buy a domain from a registrar you control, then connect it to the hosting provider.

## Fastest route to a public preview
1. Download and extract `documint.zip`.
2. Create a new GitHub repository while signed into your own GitHub account.
3. Upload the project files (keep `package.json`, `server.js`, `public/`, `README.md`, and `OWNER_SETUP.md` at the repository root).
4. Create a Render Web Service from that repository. Use `npm start` as the start command.
5. When deployment finishes, test the homepage and `/api/health`.

## Keep access safe
- Use your own email and password for GitHub, hosting and domain registrar accounts.
- Enable two-factor authentication.
- Do not send passwords, OTPs, private keys or card details in chat.
- Never place payment provider secret keys in public files or frontend JavaScript.

## Before calling it a paid SaaS
The current build is a working MVP, not yet a full multi-user paid SaaS. Cloud account login, server-side persistent document storage, payments, subscriptions, and a private owner admin panel are not included. Those require account/provider setup and additional implementation and testing. Do not accept customer payments for features that are not enabled.
