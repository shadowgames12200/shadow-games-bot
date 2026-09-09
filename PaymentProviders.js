const crypto = require('crypto');
const { db, save } = require('./ProfessionalSuite');
const PROVIDERS = {
  efi: { name: 'Efí Bank', env: ['EFI_CLIENT_ID', 'EFI_CLIENT_SECRET', 'EFI_CERT_PATH', 'EFI_KEY_PATH', 'EFI_PIX_KEY'], docs: 'https://dev.efipay.com.br/docs/api-pix/' },
  inter: { name: 'Banco Inter', env: ['INTER_CLIENT_ID', 'INTER_CLIENT_SECRET', 'INTER_CERT_PATH', 'INTER_KEY_PATH', 'INTER_PIX_KEY'], docs: 'https://developers.inter.co/references/pix' },
  bb: { name: 'Banco do Brasil', env: ['BB_CLIENT_ID', 'BB_CLIENT_SECRET', 'BB_CERT_PATH', 'BB_KEY_PATH', 'BB_PIX_KEY'], docs: 'https://www.bb.com.br/site/developers/api-pix/' },
  asaas: { name: 'Asaas', env: ['ASAAS_API_KEY', 'ASAAS_PIX_KEY'], docs: 'https://docs.asaas.com/reference/criar-nova-cobranca' }
};
function ensure() { db.payment ||= { provider: '', mode: 'sandbox', webhookSecret: '', charges: {}, events: {}, lastEventAt: null }; save(); }
function configured(key) { const p = PROVIDERS[key]; return !!p && p.env.every(x => !!process.env[x] || !!db.payment?.[x]); }
function select(key, mode = 'sandbox') { ensure(); if (!PROVIDERS[key]) throw new Error('Provedor de pagamento inválido.'); db.payment.provider = key; db.payment.mode = mode; save(); return status(); }
function status() { ensure(); const key = db.payment.provider; const p = PROVIDERS[key]; return { provider: key || null, name: p?.name || null, mode: db.payment.mode, configured: !!(key && configured(key)), docs: p?.docs || null }; }
function createOrderRef(orderId) { return `SG${String(orderId || Date.now()).replace(/[^a-zA-Z0-9]/g, '').slice(-25)}${crypto.randomBytes(3).toString('hex')}`.slice(0, 35); }
function recordCharge(ref, data) { ensure(); db.payment.charges[ref] = { ref, status: 'PENDING', createdAt: new Date().toISOString(), ...data }; save(); return db.payment.charges[ref]; }
function processWebhook(provider, body, signature) { ensure(); if (provider !== db.payment.provider) return { ok: false, reason: 'provider_not_selected' }; const eventId = String(body.id || body.eventId || body.txid || crypto.createHash('sha256').update(JSON.stringify(body)).digest('hex')); if (db.payment.events[eventId]) return { ok: true, duplicate: true }; db.payment.events[eventId] = { provider, receivedAt: new Date().toISOString(), body }; db.payment.lastEventAt = new Date().toISOString(); const ref = body.txid || body.externalReference || body.external_reference || body.paymentId; if (ref && db.payment.charges[ref]) db.payment.charges[ref].status = String(body.status || body.event || 'PAID').toUpperCase(); save(); return { ok: true, eventId, ref }; }
module.exports = { PROVIDERS, ensure, configured, select, status, createOrderRef, recordCharge, processWebhook };
