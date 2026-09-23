const crypto = require('crypto');
const axios = require('axios');
const { db, save } = require('./ProfessionalSuite');
const PROVIDERS = {
  efi: { name: 'Efí Bank', env: ['EFI_CLIENT_ID', 'EFI_CLIENT_SECRET', 'EFI_CERT_PATH', 'EFI_KEY_PATH', 'EFI_PIX_KEY'], docs: 'https://dev.efipay.com.br/docs/api-pix/' },
  inter: { name: 'Banco Inter', env: ['INTER_CLIENT_ID', 'INTER_CLIENT_SECRET', 'INTER_CERT_PATH', 'INTER_KEY_PATH', 'INTER_PIX_KEY'], docs: 'https://developers.inter.co/references/pix' },
  bb: { name: 'Banco do Brasil', env: ['BB_CLIENT_ID', 'BB_CLIENT_SECRET', 'BB_CERT_PATH', 'BB_KEY_PATH', 'BB_PIX_KEY'], docs: 'https://www.bb.com.br/site/developers/api-pix/' },
  asaas: { name: 'Asaas', env: ['ASAAS_API_KEY'], docs: 'https://docs.asaas.com/reference/criar-nova-cobranca' }
};
function ensure() { db.payment ||= { provider: '', mode: 'sandbox', webhookSecret: '', charges: {}, events: {}, lastEventAt: null }; db.payment.charges ||= {}; db.payment.events ||= {}; save(); }
function configured(key) { const p = PROVIDERS[key]; return !!p && p.env.every(x => !!process.env[x] || !!db.payment?.[x]); }
function select(key, mode = 'sandbox') { ensure(); if (key !== 'asaas') throw new Error('Apenas o Asaas está habilitado como banco operacional.'); db.payment.provider = key; db.payment.mode = mode; save(); return status(); }
function status() { ensure(); const key = db.payment.provider; const p = PROVIDERS[key]; return { provider: key || null, name: p?.name || null, mode: db.payment.mode, configured: !!(key && configured(key)), docs: p?.docs || null }; }
function createOrderRef(orderId) { return `SG${String(orderId || Date.now()).replace(/[^a-zA-Z0-9]/g, '').slice(-25)}${crypto.randomBytes(3).toString('hex')}`.slice(0, 35); }
function recordCharge(ref, data) { ensure(); db.payment.charges[ref] = { ref, status: 'PENDING', createdAt: new Date().toISOString(), ...data }; save(); return db.payment.charges[ref]; }
function asaasBase() { return db.payment.mode === 'sandbox' ? 'https://api-sandbox.asaas.com/v3' : 'https://api.asaas.com/v3'; }
function asaasKey() { ensure(); return process.env.ASAAS_API_KEY || db.payment.ASAAS_API_KEY || ''; }
function asaasHeaders() { const key = asaasKey(); if (!key) throw new Error('ASAAS_API_KEY não configurada.'); return { access_token: key, 'Content-Type': 'application/json', 'User-Agent': 'ShadowGamesBot/1.0' }; }
async function createAsaasPixCharge({ ref, value, description, user }) {
  ensure();
  const headers = asaasHeaders();
  const email = `${String(user.id)}@users.invalid`;
  const customerResult = await axios.post(`${asaasBase()}/customers`, { name: String(user.username || user.id).slice(0, 100), email }, { headers, timeout: 15000 }).catch(async error => {
    if (error.response?.data?.errors?.some(e => /already exists|já existe/i.test(e.description || ''))) return null;
    throw error;
  });
  let customer = customerResult?.data;
  if (!customer?.id) {
    const found = await axios.get(`${asaasBase()}/customers`, { headers, params: { email }, timeout: 15000 });
    customer = found.data.data?.[0];
  }
  if (!customer?.id) throw new Error('Não foi possível criar/localizar o cliente no Asaas.');
  const charge = await axios.post(`${asaasBase()}/payments`, { customer: customer.id, billingType: 'PIX', value: Number(value), dueDate: new Date(Date.now() + 10 * 60 * 1000).toISOString().slice(0, 10), description: String(description).slice(0, 255), externalReference: ref }, { headers, timeout: 15000 });
  const qr = await axios.get(`${asaasBase()}/payments/${charge.data.id}/pixQrCode`, { headers, timeout: 15000 });
  recordCharge(ref, { provider: 'asaas', providerId: charge.data.id, externalReference: ref, status: 'PENDING', customerId: customer.id });
  return { id: charge.data.id, qrCode: qr.data.payload, encodedImage: qr.data.encodedImage, expirationDate: qr.data.expirationDate };
}
async function getAsaasPayment(id) { const response = await axios.get(`${asaasBase()}/payments/${encodeURIComponent(id)}`, { headers: asaasHeaders(), timeout: 15000 }); return response.data; }
function processWebhook(provider, body, signature) { ensure(); if (provider !== db.payment.provider) return { ok: false, reason: 'provider_not_selected' }; if (provider === 'asaas' && db.payment.webhookSecret && signature !== db.payment.webhookSecret) return { ok: false, reason: 'invalid_signature' }; const eventId = String(body.id || body.eventId || body.txid || crypto.createHash('sha256').update(JSON.stringify(body)).digest('hex')); if (db.payment.events[eventId]) return { ok: true, duplicate: true }; db.payment.events[eventId] = { provider, receivedAt: new Date().toISOString(), body }; db.payment.lastEventAt = new Date().toISOString(); const payment = body.payment || body; const ref = payment.externalReference || body.txid || body.externalReference || body.external_reference || body.paymentId; if (ref && db.payment.charges[ref]) { db.payment.charges[ref].status = String(payment.status || body.event || 'PAID').toUpperCase(); db.payment.charges[ref].providerId ||= payment.id; } save(); return { ok: true, eventId, ref }; }
module.exports = { db, save, PROVIDERS, ensure, configured, select, status, createOrderRef, recordCharge, processWebhook, createAsaasPixCharge, getAsaasPayment };
