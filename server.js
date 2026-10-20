import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { randomUUID } from 'node:crypto';

const PORT = Number(process.env.PORT || 3000);
const ROOT = new URL('./public/', import.meta.url).pathname;
const MIME = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.svg':'image/svg+xml', '.json':'application/json; charset=utf-8', '.ico':'image/x-icon' };
const send = (res, status, body, type='application/json; charset=utf-8') => { res.writeHead(status, { 'Content-Type': type, 'X-Content-Type-Options':'nosniff', 'Referrer-Policy':'strict-origin-when-cross-origin', 'X-Frame-Options':'DENY', 'Permissions-Policy':'camera=(), microphone=(), geolocation=()' }); res.end(typeof body === 'string' ? body : JSON.stringify(body)); };
async function bodyJson(req) { let data=''; for await (const chunk of req) { data += chunk; if (data.length > 1_000_000) throw new Error('Request too large'); } return JSON.parse(data || '{}'); }
function cleanText(value, max=180) { return String(value ?? '').trim().slice(0,max); }
function calculate(doc) {
  const items = Array.isArray(doc.items) ? doc.items.slice(0,100).map((item) => {
    const description = cleanText(item.description, 160);
    const quantity = Number(item.quantity);
    const unitPrice = Number(item.unitPrice);
    if (!description || !Number.isFinite(quantity) || quantity <= 0 || quantity > 1_000_000 || !Number.isFinite(unitPrice) || unitPrice < 0 || unitPrice > 1_000_000_000) throw new Error('Check each item description, quantity and unit price.');
    return { description, quantity, unitPrice, amount: Math.round(quantity * unitPrice * 100) / 100 };
  }) : [];
  if (!items.length) throw new Error('Add at least one item before preparing your document.');
  const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
  const taxRate = Number(doc.taxRate ?? 0);
  const discount = Number(doc.discount ?? 0);
  if (!Number.isFinite(taxRate) || taxRate < 0 || taxRate > 100) throw new Error('Tax must be between 0 and 100%.');
  if (!Number.isFinite(discount) || discount < 0 || discount > subtotal) throw new Error('Discount cannot exceed the subtotal.');
  const tax = Math.round(Math.max(0, subtotal - discount) * taxRate) / 100;
  return { items, subtotal: Math.round(subtotal*100)/100, discount: Math.round(discount*100)/100, tax: Math.round(tax*100)/100, total: Math.round((subtotal - discount + tax)*100)/100 };
}
const server = http.createServer(async (req,res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  if (req.method === 'GET' && url.pathname === '/api/health') return send(res,200,{ ok:true, app:'DocuMint', version:'1.0.0', timestamp:new Date().toISOString() });
  if (req.method === 'POST' && url.pathname === '/api/documents/prepare') {
    try {
      const data = await bodyJson(req);
      const totals = calculate(data);
      const type = ['invoice','quotation','receipt'].includes(data.type) ? data.type : 'invoice';
      const currency = ['NGN','USD','GBP','EUR','GHS','KES','ZAR'].includes(data.currency) ? data.currency : 'NGN';
      const prepared = {
        id: randomUUID(), documentNumber: cleanText(data.documentNumber,40) || `DM-${new Date().getFullYear()}-${randomUUID().slice(0,6).toUpperCase()}`,
        type, currency, businessName:cleanText(data.businessName,100), businessEmail:cleanText(data.businessEmail,120), businessPhone:cleanText(data.businessPhone,50), businessAddress:cleanText(data.businessAddress,240), clientName:cleanText(data.clientName,100), clientEmail:cleanText(data.clientEmail,120), clientAddress:cleanText(data.clientAddress,240), issueDate:cleanText(data.issueDate,20), dueDate:cleanText(data.dueDate,20), notes:cleanText(data.notes,1000), taxRate:Number(data.taxRate || 0), ...totals, createdAt:new Date().toISOString()
      };
      if (!prepared.businessName || !prepared.clientName) return send(res,400,{ error:'Enter your business name and the client name.' });
      return send(res,200,{ document:prepared });
    } catch (e) { return send(res,400,{ error:e.message || 'Unable to prepare this document.' }); }
  }
  if (req.method === 'GET' && url.pathname.startsWith('/api/')) return send(res,404,{ error:'API route not found.' });
  if (req.method !== 'GET' && req.method !== 'HEAD') return send(res,405,{ error:'Method not allowed.' });
  let path = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
  path = normalize(path).replace(/^([.][.][/\\])+/, '');
  const filePath = join(ROOT, path);
  try { const content = await readFile(filePath); res.writeHead(200, { 'Content-Type':MIME[extname(filePath)] || 'application/octet-stream', 'X-Content-Type-Options':'nosniff', 'Referrer-Policy':'strict-origin-when-cross-origin', 'X-Frame-Options':'DENY' }); return res.end(req.method === 'HEAD' ? undefined : content); }
  catch { return send(res,404,'Not found','text/plain; charset=utf-8'); }
});
server.listen(PORT, '0.0.0.0', () => console.log(`DocuMint running on http://localhost:${PORT}`));
