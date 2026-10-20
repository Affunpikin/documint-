const $ = (id) => document.getElementById(id);
const moneySymbols = {NGN:'₦',USD:'$',GBP:'£',EUR:'€',GHS:'GH₵',KES:'KSh ',ZAR:'R'};
const STORAGE_KEY = 'documint:drafts:v1';
let currentType = 'invoice';
let currentDocumentNumber = `DM-${new Date().getFullYear()}-${Math.random().toString(36).slice(2,8).toUpperCase()}`;
let itemCounter = 0;
let toastTimer;
const today = new Date();
const dateString = (date) => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
$('year').textContent = today.getFullYear();
$('issueDate').value = dateString(today);
const due = new Date(today); due.setDate(due.getDate()+14); $('dueDate').value = dateString(due);

function toast(message) {
  const el = $('toast'); el.textContent = message; el.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 2900);
}
function escapeHtml(value='') { return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function readItems() {
  return [...$('itemsEditor').querySelectorAll('.item-row')].map(row => ({
    description: row.querySelector('[data-field="description"]').value.trim(),
    quantity: Number(row.querySelector('[data-field="quantity"]').value || 0),
    unitPrice: Number(row.querySelector('[data-field="unitPrice"]').value || 0)
  }));
}
function currencyFormat(value, currency=$('currency').value) {
  try { return new Intl.NumberFormat(undefined,{style:'currency',currency,maximumFractionDigits:2}).format(Number(value)||0); }
  catch { return `${moneySymbols[currency] || ''}${(Number(value)||0).toFixed(2)}`; }
}
function addItem(item={description:'',quantity:1,unitPrice:0}) {
  itemCounter++;
  const row = document.createElement('div'); row.className='item-row'; row.dataset.itemId=String(itemCounter);
  row.innerHTML = `<label class="field">Description<input data-field="description" maxlength="160" placeholder="e.g. Design service" value="${escapeHtml(item.description)}" required></label><label class="field">Qty<input data-field="quantity" type="number" min="0.01" step="0.01" value="${Number(item.quantity)||1}" required></label><label class="field">Unit price<input data-field="unitPrice" type="number" min="0" step="0.01" value="${Number(item.unitPrice)||0}" required></label><button class="remove-item" type="button" aria-label="Remove item" title="Remove item">×</button>`;
  row.querySelectorAll('input').forEach(input => input.addEventListener('input', updatePreview));
  row.querySelector('.remove-item').addEventListener('click', () => { if ($('itemsEditor').children.length === 1) { toast('Keep at least one line item.'); return; } row.remove(); updatePreview(); });
  $('itemsEditor').appendChild(row); updatePreview();
}
function getData() {
  return {
    type: currentType,
    documentNumber: currentDocumentNumber,
    businessName: $('businessName').value,
    businessEmail: $('businessEmail').value,
    businessPhone: $('businessPhone').value,
    businessAddress: $('businessAddress').value,
    clientName: $('clientName').value,
    clientEmail: $('clientEmail').value,
    clientAddress: $('clientAddress').value,
    currency: $('currency').value,
    issueDate: $('issueDate').value,
    dueDate: $('dueDate').value,
    taxRate: Number($('taxRate').value || 0),
    discount: Number($('discount').value || 0),
    notes: $('notes').value,
    items: readItems()
  };
}
function localTotals(data) {
  const subtotal = data.items.reduce((s,i) => s + Math.max(0,Number(i.quantity)||0)*Math.max(0,Number(i.unitPrice)||0),0);
  const discount = Math.min(subtotal, Math.max(0,Number(data.discount)||0));
  const tax = Math.max(0,subtotal-discount)*Math.min(100,Math.max(0,Number(data.taxRate)||0))/100;
  return {subtotal,discount,tax,total:subtotal-discount+tax};
}
function shortDate(value) { if (!value) return '—'; const date = new Date(`${value}T12:00:00`); return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'}); }
function renderPreview(data=getData()) {
  const total = localTotals(data), sym=moneySymbols[data.currency] || '';
  const title = {invoice:'Invoice',quotation:'Quotation',receipt:'Receipt'}[data.type] || 'Invoice';
  const number = data.documentNumber || `DM-${today.getFullYear()}-${String(1000+Math.floor(Math.random()*8999))}`;
  const rows = data.items.map(item => `<tr><td>${escapeHtml(item.description || 'Service or product')}</td><td>${Number(item.quantity)||0}</td><td>${currencyFormat(item.unitPrice,data.currency)}</td><td>${currencyFormat((Number(item.quantity)||0)*(Number(item.unitPrice)||0),data.currency)}</td></tr>`).join('');
  $('documentPreview').innerHTML = `<div class="paper-head"><div class="paper-brand"><span class="paper-brand-mark">D</span><span>${escapeHtml(data.businessName || 'Your business name')}</span></div><div class="paper-type">${escapeHtml(number)}<strong>${title.toUpperCase()}</strong></div></div>
  <div class="paper-meta"><div><small>FROM</small><strong>${escapeHtml(data.businessName || 'Your business name')}</strong><span>${escapeHtml(data.businessEmail)}${data.businessPhone ? '\n'+escapeHtml(data.businessPhone):''}${data.businessAddress ? '\n'+escapeHtml(data.businessAddress):''}</span></div><div><small>BILL TO</small><strong>${escapeHtml(data.clientName || 'Customer name')}</strong><span>${escapeHtml(data.clientEmail)}${data.clientAddress ? '\n'+escapeHtml(data.clientAddress):''}</span></div><div class="paper-dates"><small>ISSUED</small><strong>${shortDate(data.issueDate)}</strong><span>${data.type==='quotation'?'Valid until':'Due'}: ${shortDate(data.dueDate)}</span></div></div>
  <table class="paper-items"><thead><tr><th>DESCRIPTION</th><th>QTY</th><th>UNIT PRICE</th><th>AMOUNT</th></tr></thead><tbody>${rows}</tbody></table>
  <div class="paper-totals"><div class="paper-total-row"><span>Subtotal</span><strong>${currencyFormat(total.subtotal,data.currency)}</strong></div>${total.discount>0?`<div class="paper-total-row"><span>Discount</span><strong>−${currencyFormat(total.discount,data.currency)}</strong></div>`:''}${Number(data.taxRate)>0?`<div class="paper-total-row"><span>Tax (${Number(data.taxRate)}%)</span><strong>${currencyFormat(total.tax,data.currency)}</strong></div>`:''}<div class="paper-total-row grand"><span>${data.type==='receipt'?'Amount paid':'Total due'}</span><strong>${currencyFormat(total.total,data.currency)}</strong></div></div>
  ${data.notes?`<div class="paper-notes"><small>NOTE</small><p>${escapeHtml(data.notes)}</p></div>`:''}<div class="paper-thanks">${data.type==='receipt'?'Thank you. Payment received.':data.type==='quotation'?'Thank you for considering our proposal.':'Thank you for your business.'}</div>`;
}
function updatePreview() { $('discountCurrency').textContent=moneySymbols[$('currency').value] || ''; renderPreview(); }
function setType(type) {
  if (!['invoice','quotation','receipt'].includes(type)) return;
  currentType=type;
  document.querySelectorAll('.tool-card[data-type]').forEach(b=>b.classList.toggle('active',b.dataset.type===type));
  document.querySelectorAll('.type-button').forEach(b=>b.classList.toggle('selected',b.dataset.type===type));
  updatePreview();
}
function getDrafts() { try { const d=JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]'); return Array.isArray(d)?d:[]; } catch { return []; } }
function saveDraft(silent=false) {
  const data=getData();
  if (!data.businessName.trim() || !data.clientName.trim()) { $('formError').textContent='Add your business name and customer name before saving this draft.'; if(!silent) toast('Add your business and customer names first.'); return false; }
  if (!data.items.some(i=>i.description && i.quantity>0 && i.unitPrice>=0)) { if(!silent) toast('Add at least one valid line item.'); return false; }
  const totals=localTotals(data);
  if (totals.discount > totals.subtotal) { if(!silent) toast('Discount cannot exceed the subtotal.'); return false; }
  const drafts=getDrafts(); const draft={...data,id:data.documentNumber || `DM-${today.getFullYear()}-${Math.random().toString(36).slice(2,8).toUpperCase()}`,savedAt:new Date().toISOString()};
  const index=drafts.findIndex(d=>d.id===draft.id); if(index>=0) drafts[index]=draft; else drafts.unshift(draft);
  try { localStorage.setItem(STORAGE_KEY,JSON.stringify(drafts.slice(0,50))); $('formError').textContent=''; if(!silent) toast('Draft saved on this device.'); return true; }
  catch { if(!silent) toast('Could not save. Your browser storage may be full.'); return false; }
}
function loadDraft(draft) {
  ['businessName','businessEmail','businessPhone','businessAddress','clientName','clientEmail','clientAddress','issueDate','dueDate','taxRate','discount','notes'].forEach(key=>{ if($(key)) $(key).value=draft[key] ?? ''; });
  currentDocumentNumber=draft.documentNumber || draft.id || `DM-${new Date().getFullYear()}-${Math.random().toString(36).slice(2,8).toUpperCase()}`;
  $('currency').value=draft.currency||'NGN'; setType(draft.type||'invoice'); $('itemsEditor').innerHTML=''; itemCounter=0; (draft.items||[]).forEach(addItem); updatePreview(); $('builder').scrollIntoView({behavior:'smooth'}); toast('Draft opened.');
}
function openSaved() {
  const drafts=getDrafts();
  if(!drafts.length){toast('No saved drafts yet. Create a document and choose Save draft.');return;}
  const list=drafts.map((d,i)=>`${i+1}. ${(d.type||'invoice').toUpperCase()} · ${d.clientName||'Unnamed customer'} · ${d.documentNumber||d.id} · ${new Date(d.savedAt).toLocaleDateString()}`).join('\n');
  const answer=window.prompt(`Your saved drafts (enter a number to open):\n\n${list}`,'1');
  if(answer===null)return; const index=Number(answer)-1;
  if(!Number.isInteger(index)||index<0||index>=drafts.length){toast('That draft number is not in the list.');return;}
  loadDraft(drafts[index]);
}
async function prepareDocument() {
  const data=getData(); $('formError').textContent='';
  if(!data.businessName.trim() || !data.clientName.trim()){ $('formError').textContent='Enter your business name and the customer name.'; return; }
  try {
    const response=await fetch('/api/documents/prepare',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
    const result=await response.json(); if(!response.ok) throw new Error(result.error||'Could not prepare the document.');
    data.documentNumber=result.document.documentNumber; data.id=result.document.id; currentDocumentNumber=result.document.documentNumber;
    renderPreview(data); saveDraft(true); toast('Document prepared. Use Print / Save PDF to export it.');
  } catch(error) { $('formError').textContent=error.message || 'Could not connect to the document service. Check your connection and try again.'; }
}
function clearForm() {
  if(!confirm('Start a fresh document? This will clear the current form. Saved drafts will stay on this device.')) return;
  $('docForm').reset(); $('businessName').value=''; $('businessEmail').value=''; $('businessPhone').value=''; $('businessAddress').value=''; $('clientName').value=''; $('clientEmail').value=''; $('clientAddress').value=''; $('notes').value=''; $('taxRate').value='0'; $('discount').value='0'; $('issueDate').value=dateString(today); $('dueDate').value=dateString(due); $('currency').value='NGN'; currentDocumentNumber=`DM-${new Date().getFullYear()}-${Math.random().toString(36).slice(2,8).toUpperCase()}`; $('itemsEditor').innerHTML=''; itemCounter=0; addItem({description:'',quantity:1,unitPrice:0}); $('formError').textContent=''; setType('invoice'); toast('Fresh document ready.');
}
function scrollToBuilder() { $('builder').scrollIntoView({behavior:'smooth'}); setTimeout(()=>$('businessName').focus({preventScroll:true}),450); }
$('addItem').addEventListener('click',()=>addItem());
$('currency').addEventListener('change',updatePreview);
['businessName','businessEmail','businessPhone','businessAddress','clientName','clientEmail','clientAddress','issueDate','dueDate','taxRate','discount','notes'].forEach(id=>$(id).addEventListener('input',updatePreview));
$('docForm').addEventListener('submit',e=>{e.preventDefault();prepareDocument();});
$('saveDraft').addEventListener('click',()=>saveDraft());
$('downloadPdf').addEventListener('click',()=>{const data=getData(); if(!data.businessName.trim()||!data.clientName.trim()){toast('Add your business and customer names first.');scrollToBuilder();return;} window.print();});
$('clearForm').addEventListener('click',clearForm);
$('openSaved').addEventListener('click',openSaved);
document.querySelectorAll('[data-type]').forEach(button=>button.addEventListener('click',()=>setType(button.dataset.type)));
['startTop','startHero','startBottom'].forEach(id=>$(id).addEventListener('click',scrollToBuilder));
$('menuToggle').addEventListener('click',()=>document.querySelector('.site-header nav').classList.toggle('open'));
document.querySelectorAll('.site-header nav a').forEach(a=>a.addEventListener('click',()=>document.querySelector('.site-header nav').classList.remove('open')));
addItem({description:'Design or professional service',quantity:1,unitPrice:0});
renderPreview();
