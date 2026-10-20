# DocuMint — Business Document Studio

A responsive MVP for creating invoices, quotations and receipts. Built with vanilla HTML/CSS/JavaScript and a Node.js backend so it runs without a framework or build step.

## Current features
- Responsive landing page and document studio.
- Invoice, quotation and receipt modes.
- Multiple line items with quantity and unit price.
- Currency selector: NGN, USD, GBP, EUR, GHS, KES and ZAR.
- Live totals, discount and tax calculations.
- Server-side validation and document number generation (`POST /api/documents/prepare`).
- Save and reopen up to 50 drafts in the current browser (`localStorage`).
- Print / Save as PDF through the browser's native print dialog.
- Health endpoint (`GET /api/health`).
- No API keys or paid services required for the MVP.

## Run locally
Requires Node.js 20 or newer.

```bash
npm start
```

Then open http://localhost:3000.

For development with automatic server restart:

```bash
npm run dev
```

## Deploy on Render
1. Create a GitHub repository and upload the contents of this folder.
2. In Render, create a **Web Service** and connect that repository.
3. Runtime: Node. Build command: leave blank (or `npm install`, no dependencies are required). Start command: `npm start`.
4. Choose a free or paid instance according to Render's current options, then deploy.
5. Test `https://YOUR-SERVICE.onrender.com/api/health` and open the homepage.
6. Add a custom domain only after the service is live, then follow Render's DNS instructions.

Alternative: deploy as a Node web service on Railway or another host that supports Node.js. The server binds to `0.0.0.0` and uses the `PORT` environment variable supplied by the host.

## Important MVP limitations
- Drafts are stored only in the visitor's browser. They do not sync across devices and can be lost if browser storage is cleared.
- This release does not yet have user accounts, a cloud database, subscription billing, payment processing, automated email delivery, or an admin dashboard.
- Paid plans are not enabled. Do not advertise a paid plan until billing and entitlements are implemented and tested.
- PDF export uses the browser print dialog. Users select “Save as PDF”.
- The service does not send documents to a server for permanent storage. The backend validates data and returns a prepared document response only.
- Google Fonts are loaded from Google Fonts when a connection is available; fallback fonts are provided.

## Before charging customers
Recommended production phase: add Supabase authentication and database with row-level security, account-scoped document storage, a verified payment provider (Paystack for Nigerian customers and/or Stripe where available), transactional email, rate limiting, error monitoring, privacy/terms pages, and automated tests. Never put secret keys in frontend JavaScript or commit them to GitHub.

## API
### `GET /api/health`
Returns app status and version.

### `POST /api/documents/prepare`
Example JSON:

```json
{
  "type": "invoice",
  "currency": "NGN",
  "businessName": "Studio North",
  "clientName": "Olivia James",
  "taxRate": 7.5,
  "discount": 0,
  "items": [
    { "description": "Design service", "quantity": 1, "unitPrice": 8500 }
  ]
}
```

Returns a validated document object with line amounts, subtotal, tax, discount, total, ID and document number. Invalid input returns HTTP 400 with an error message.
