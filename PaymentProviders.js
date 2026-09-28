const crypto = require('crypto');
const fs = require('fs');
const https = require('https');
const axios = require('axios');
const { db, save } = require('./ProfessionalSuite');

const PROVIDERS = {
  efi: { name: 'Efí Bank', env: ['EFI_CLIENT_ID', 'EFI_CLIENT_SECRET', 'EFI_PIX_KEY'], docs: 'https://dev.efipay.com.br/docs/api-pix/' },
  inter: { name: 'Banco Inter', env: ['INTER_CLIENT_ID', 'INTER_CLIENT_SECRET', 'INTER_CERT_PATH', 'INTER_KEY_PATH', 'INTER_PIX_KEY'], docs: 'https://developers.inter.co/references/pix' },
  bb: { name: 'Banco do Brasil', env: ['BB_CLIENT_ID', 'BB_CLIENT_SECRET', 'BB_CERT_PATH', 'BB_KEY_PATH', 'BB_PIX_KEY'], docs: 'https://www.bb.com.br/site/developers/api-pix/' },
  asaas: { name: 'Asaas', env: ['ASAAS_API_KEY'], docs: 'https://docs.asaas.com/reference/criar-nova-cobranca' }
};

let efiToken = null;
let efiTokenExpiresAt = 0;
let efiTokenCacheKey = '';
let efiCobToken = null;
let efiCobTokenExpiresAt = 0;
let efiCobTokenCacheKey = '';

function ensure() {
  let changed = false;
  if (!db.payment) {
    db.payment = { provider: '', mode: 'sandbox', webhookSecret: '', charges: {}, events: {}, lastEventAt: null };
    changed = true;
  }
  if (!db.payment.charges) { db.payment.charges = {}; changed = true; }
  if (!db.payment.events) { db.payment.events = {}; changed = true; }
  if (!db.payment.mode) { db.payment.mode = 'sandbox'; changed = true; }
  if (changed) save();
}

function efiCertificateConfigured() {
  const p12Base64 = process.env.EFI_CERT_P12_BASE64;
  const p12Path = process.env.EFI_CERT_P12_PATH;
  if (p12Base64) return true;
  if (p12Path) return fs.existsSync(p12Path);

  const certBase64 = process.env.EFI_CERT_BASE64;
  const keyBase64 = process.env.EFI_KEY_BASE64;
  if (certBase64 && keyBase64) return true;
  const certPath = process.env.EFI_CERT_PATH;
  const keyPath = process.env.EFI_KEY_PATH;
  return Boolean(certPath && keyPath && fs.existsSync(certPath) && fs.existsSync(keyPath));
}

function configured(key) {
  const provider = PROVIDERS[key];
  if (!provider) return false;
  if (key === 'efi') {
    return Boolean(process.env.EFI_CLIENT_ID && process.env.EFI_CLIENT_SECRET && process.env.EFI_PIX_KEY && efiCertificateConfigured());
  }
  return provider.env.every(name => Boolean(process.env[name] || db.payment?.[name]));
}

function select(key, mode = 'sandbox') {
  ensure();
  if (!['efi', 'asaas'].includes(key)) throw new Error('Provedor ainda não habilitado. Selecione Efí Bank ou Asaas.');
  if (!['sandbox', 'production'].includes(mode)) throw new Error('Modo inválido. Use sandbox ou production.');
  if (key === 'efi' && mode === 'production' && !configured('efi')) {
    throw new Error('Configure as credenciais de produção e o certificado da Efí antes de ativar o ambiente production.');
  }
  if (key === 'efi' && db.payment.provider === 'efi' && db.payment.mode !== mode) {
    const pending = Object.values(db.payment.charges).some(charge =>
      charge.provider === 'efi' && ['PENDING', 'ATIVA'].includes(String(charge.status).toUpperCase()) && Number(charge.expiresAt) > Date.now()
    );
    if (pending) throw new Error('Há cobranças Efí pendentes. Aguarde a confirmação/expiração antes de trocar sandbox e produção.');
  }
  db.payment.provider = key;
  db.payment.mode = mode;
  save();
  return status();
}

function status() {
  ensure();
  const key = db.payment.provider;
  const provider = PROVIDERS[key];
  return { provider: key || null, name: provider?.name || null, mode: db.payment.mode, configured: Boolean(key && configured(key)), docs: provider?.docs || null };
}

function createOrderRef(orderId) {
  return `SG${String(orderId || Date.now()).replace(/[^a-zA-Z0-9]/g, '').slice(-25)}${crypto.randomBytes(3).toString('hex')}`.slice(0, 35);
}

function recordCharge(ref, data) {
  ensure();
  db.payment.charges[ref] = { ref, status: 'PENDING', createdAt: new Date().toISOString(), ...data };
  save();
  return db.payment.charges[ref];
}

function asaasBase() { return db.payment.mode === 'sandbox' ? 'https://api-sandbox.asaas.com/v3' : 'https://api.asaas.com/v3'; }
function asaasKey() { ensure(); return process.env.ASAAS_API_KEY || db.payment.ASAAS_API_KEY || ''; }
function asaasHeaders() {
  const key = asaasKey();
  if (!key) throw new Error('ASAAS_API_KEY não configurada.');
  return { access_token: key, 'Content-Type': 'application/json', 'User-Agent': 'ShadowGamesBot/1.0' };
}
function asaasError(error, operation) {
  const details = error.response?.data;
  const apiMessage = details?.errors?.map(item => item.description || item.code).filter(Boolean).join('; ');
  const message = apiMessage || details?.message || error.message || 'Erro desconhecido na API Asaas.';
  const wrapped = new Error(`[Asaas/${operation}] ${message}`);
  wrapped.status = error.response?.status || null;
  wrapped.details = details || null;
  console.error(`[Asaas/${operation}]`, { status: wrapped.status, details: wrapped.details });
  return wrapped;
}

function certificateFileOrBase64(base64Name, pathName, label) {
  if (process.env[base64Name]) return Buffer.from(process.env[base64Name].trim(), 'base64');
  const filePath = process.env[pathName];
  if (filePath && fs.existsSync(filePath)) return fs.readFileSync(filePath);
  throw new Error(`${label} não configurado. Defina o certificado no ambiente do bot.`);
}

function efiHttpsAgent() {
  const tls = { minVersion: 'TLSv1.2', rejectUnauthorized: true };
  if (process.env.EFI_CERT_P12_BASE64 || process.env.EFI_CERT_P12_PATH) {
    return new https.Agent({
      ...tls,
      pfx: certificateFileOrBase64('EFI_CERT_P12_BASE64', 'EFI_CERT_P12_PATH', 'EFI_CERT_P12_BASE64/EFI_CERT_P12_PATH'),
      passphrase: process.env.EFI_CERT_P12_PASSWORD || ''
    });
  }
  return new https.Agent({
    ...tls,
    cert: certificateFileOrBase64('EFI_CERT_BASE64', 'EFI_CERT_PATH', 'EFI_CERT_BASE64/EFI_CERT_PATH'),
    key: certificateFileOrBase64('EFI_KEY_BASE64', 'EFI_KEY_PATH', 'EFI_KEY_BASE64/EFI_KEY_PATH'),
    passphrase: process.env.EFI_KEY_PASSWORD || undefined
  });
}

function efiBase(mode = db.payment.mode) {
  return mode === 'production' ? 'https://pix.api.efipay.com.br' : 'https://pix-h.api.efipay.com.br';
}
function efiCobBase(mode = db.payment.mode) {
  return mode === 'production' ? 'https://cobrancas.api.efipay.com.br' : 'https://cobrancas-h.api.efipay.com.br';
}

function toMinorUnits(value) {
  const normalized = Number(String(value ?? '').trim().replace(',', '.'));
  if (!Number.isFinite(normalized)) return NaN;
  return Math.round(normalized * 100);
}

function isEfiChargePaid(charge, expectedValue) {
  if (String(charge?.status || '').toUpperCase() !== 'CONCLUIDA') return false;
  const pix = Array.isArray(charge.pix) ? charge.pix : [];
  if (pix.length === 0) return false;
  const expectedCents = toMinorUnits(expectedValue);
  const receivedCents = pix.reduce((sum, payment) => {
    const cents = toMinorUnits(payment?.valor);
    return Number.isFinite(cents) ? sum + cents : sum;
  }, 0);
  return Number.isFinite(expectedCents) && receivedCents === expectedCents;
}

function buildEfiChargePayload({ ref, value, description, pixKey = process.env.EFI_PIX_KEY }) {
  const numericValue = Number(String(value ?? '').replace(',', '.'));
  if (!Number.isFinite(numericValue) || numericValue <= 0) throw new Error(`Valor inválido para cobrança: ${value}`);
  if (Math.round(numericValue * 100) < 1) throw new Error('O valor mínimo para uma cobrança Pix é R$ 0,01.');
  if (!pixKey) throw new Error('EFI_PIX_KEY não configurada.');
  return {
    calendario: { expiracao: 600 },
    valor: { original: numericValue.toFixed(2) },
    chave: pixKey,
    solicitacaoPagador: String(description || `Pedido ${ref}`).slice(0, 140)
    // O objeto "devedor" não é enviado: nenhuma identificação do comprador é solicitada.
  };
}

async function efiAccessToken(mode = db.payment.mode) {
  const clientId = process.env.EFI_CLIENT_ID || '';
  const clientSecret = process.env.EFI_CLIENT_SECRET || '';
  if (!clientId || !clientSecret) throw new Error('EFI_CLIENT_ID e EFI_CLIENT_SECRET não configurados.');
  const cacheKey = `${mode}:${clientId}`;
  if (efiToken && efiTokenCacheKey === cacheKey && Date.now() < efiTokenExpiresAt) return efiToken;

  try {
    const response = await axios.post(`${efiBase(mode)}/oauth/token`, { grant_type: 'client_credentials' }, {
      httpsAgent: efiHttpsAgent(),
      auth: { username: clientId, password: clientSecret },
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      timeout: 15000
    });
    if (!response.data?.access_token) throw new Error('A Efí não retornou access_token.');
    efiToken = response.data.access_token;
    efiTokenCacheKey = cacheKey;
    efiTokenExpiresAt = Date.now() + Math.max(60, Number(response.data.expires_in || 3600) - 60) * 1000;
    return efiToken;
  } catch (error) {
    throw efiError(error, 'autenticar');
  }
}

function efiError(error, operation) {
  const status = error.response?.status;
  const data = error.response?.data;
  const apiMessage = data?.mensagem || data?.message || data?.error_description || data?.error;
  const message = apiMessage || (status ? `a API respondeu HTTP ${status}` : error.message) || 'falha de comunicação';
  const wrapped = new Error(`[Efí/${operation}] ${String(message).slice(0, 300)}`);
  wrapped.status = status || null;
  // Do not log request config, Authorization headers, client secret, token, or certificate.
  return wrapped;
}

async function efiRequest(method, path, data, mode = db.payment.mode) {
  const token = await efiAccessToken(mode);
  try {
    const response = await axios.request({
      method,
      url: `${efiBase(mode)}${path}`,
      ...(data === undefined ? {} : { data }),
      httpsAgent: efiHttpsAgent(),
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json' },
      timeout: 15000
    });
    return response.data;
  } catch (error) {
    if (error.response?.status === 401) {
      efiToken = null;
      efiTokenExpiresAt = 0;
    }
    throw efiError(error, method === 'post' ? 'criar-cobranca' : 'consultar-cobranca');
  }
}


async function efiCobAccessToken(mode = db.payment.mode) {
  const id = process.env.EFI_COB_CLIENT_ID || process.env.EFI_CLIENT_ID || '';
  const secret = process.env.EFI_COB_CLIENT_SECRET || process.env.EFI_CLIENT_SECRET || '';
  if (!id || !secret) throw new Error('Credenciais da API Cobranças Efí não configuradas.');
  const key = `${mode}:${id}`;
  if (efiCobToken && efiCobTokenCacheKey === key && Date.now() < efiCobTokenExpiresAt) return efiCobToken;
  try {
    const response = await axios.post(`${efiCobBase(mode)}/v1/authorize`,
      { grant_type: 'client_credentials' }, {
        httpsAgent: efiHttpsAgent(),
        auth: { username: id, password: secret },
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        timeout: 15000
      });
    if (!response.data?.access_token) throw new Error('A Efí não retornou token da API Cobranças.');
    efiCobToken = response.data.access_token;
    efiCobTokenCacheKey = key;
    efiCobTokenExpiresAt = Date.now() + Math.max(60, Number(response.data.expires_in || 600) - 60) * 1000;
    return efiCobToken;
  } catch (error) { throw efiError(error, 'autenticar-cobrancas'); }
}

async function efiCobRequest(method, path, data, mode = db.payment.mode) {
  const token = await efiCobAccessToken(mode);
  try {
    const response = await axios.request({
      method, url: `${efiCobBase(mode)}${path}`, data,
      httpsAgent: efiHttpsAgent(),
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json' },
      timeout: 15000
    });
    return response.data;
  } catch (error) {
    if (error.response?.status === 401) { efiCobToken = null; efiCobTokenExpiresAt = 0; }
    throw efiError(error, method === 'post' ? 'cobrancas' : 'consultar-cobrancas');
  }
}

async function getEfiPaymentLink(chargeId, mode = db.payment.mode) {
  if (!chargeId || !/^\d+$/.test(String(chargeId))) throw new Error('charge_id Efí inválido.');
  return efiCobRequest('get', `/v1/charge/${encodeURIComponent(chargeId)}`, undefined, mode);
}

async function createEfiPaymentLink({ ref, value, description, productName, quantity }) {
  ensure();
  if (!configured('efi')) throw new Error('Efí não configurada.');
  const amount = Number(String(value ?? '').replace(',', '.'));
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('Valor inválido para cartão.');
  const mode = db.payment.mode;
  const publicUrl = process.env.RENDER_EXTERNAL_URL || 'https://shadow-games-bot-na47.onrender.com';
  const body = {
    items: [{ name: String(productName || 'Pedido Shadow Games').slice(0, 100),
      value: Math.round(amount * 100), amount: Number(quantity) || 1 }],
    metadata: { custom_id: ref, notification_url: `${publicUrl}/webhooks/efi` },
    settings: { payment_method: 'credit_card',
      expire_at: new Date(Date.now() + 10 * 60 * 1000).toISOString().slice(0, 10),
      message: String(description || `Pedido ${ref}`).slice(0, 80) }
  };
  const response = await efiCobRequest('post', '/v1/charge/one-step/link', body, mode);
  const data = response?.data || {};
  if (!data.payment_url || !data.charge_id) {
    throw new Error('A Efí não retornou o link. Habilite API de Emissões e cartão.');
  }
  recordCharge(ref, { provider: 'efi', providerId: String(data.charge_id),
    externalReference: ref, mode, method: 'credit_card', status: 'LINK',
    paymentUrl: data.payment_url, expiresAt: Date.now() + 10 * 60 * 1000 });
  return { id: String(data.charge_id), ref, paymentUrl: data.payment_url, mode };
}

async function createEfiPixCharge({ ref, value, description }) {
  ensure();
  if (!configured('efi')) throw new Error('Efí ainda não configurada. Defina credenciais, chave Pix e certificado no ambiente do bot.');
  const body = buildEfiChargePayload({ ref, value, description });
  const numericValue = Number(body.valor.original);
  const mode = db.payment.mode;
  const response = await efiRequest('post', '/v2/cob', body, mode);
  const txid = response?.txid;
  const qrCode = response?.pixCopiaECola;
  if (!txid || !qrCode) throw new Error('A Efí não retornou txid e Pix Copia e Cola para esta cobrança.');
  recordCharge(ref, {
    provider: 'efi', providerId: txid, externalReference: ref, mode,
    status: String(response.status || 'ATIVA').toUpperCase(), value: numericValue.toFixed(2),
    expiresAt: Date.now() + 10 * 60 * 1000
  });
  return { id: txid, ref, qrCode, status: response.status || 'ATIVA', mode, expiresAt: Date.now() + 10 * 60 * 1000 };
}

async function getEfiCharge(txid, mode = db.payment.mode) {
  if (!configured('efi')) throw new Error('Efí ainda não configurada. Defina credenciais, chave Pix e certificado no ambiente do bot.');
  if (!txid || !/^[A-Za-z0-9]{26,35}$/.test(String(txid))) throw new Error('txid inválido para consultar cobrança Efí.');
  return efiRequest('get', `/v2/cob/${encodeURIComponent(txid)}`, undefined, mode);
}

async function createAsaasPixCharge({ ref, value, description, user, cpfCnpj }) {
  ensure();
  const numericValue = Number(String(value).replace(',', '.'));
  if (!Number.isFinite(numericValue) || numericValue <= 0) throw new Error(`Valor inválido para cobrança: ${value}`);
  try {
    const headers = asaasHeaders();
    // O Discord não fornece o e-mail do usuário. O campo é opcional no Asaas;
    // não enviar um domínio artificial evita rejeições HTTP 400.
    const normalizedCpfCnpj = String(cpfCnpj || '').replace(/\D/g, '');
    if (![11, 14].includes(normalizedCpfCnpj.length)) throw new Error('CPF ou CNPJ inválido.');
    const customer = (await axios.post(`${asaasBase()}/customers`, { name: String(user.username || user.id).slice(0, 100), cpfCnpj: normalizedCpfCnpj }, { headers, timeout: 15000 })).data;
    if (!customer?.id) throw new Error('Não foi possível criar o cliente no Asaas.');
    const charge = await axios.post(`${asaasBase()}/payments`, { customer: customer.id, billingType: 'PIX', value: Number(numericValue.toFixed(2)), dueDate: new Date(Date.now() + 10 * 60 * 1000).toISOString().slice(0, 10), description: String(description).slice(0, 255), externalReference: ref }, { headers, timeout: 15000 });
    const qr = await axios.get(`${asaasBase()}/payments/${charge.data.id}/pixQrCode`, { headers, timeout: 15000 });
    recordCharge(ref, { provider: 'asaas', providerId: charge.data.id, externalReference: ref, status: 'PENDING', customerId: customer.id });
    return { id: charge.data.id, qrCode: qr.data.payload, encodedImage: qr.data.encodedImage, expirationDate: qr.data.expirationDate };
  } catch (error) {
    throw error.response ? asaasError(error, 'criar-pix') : error;
  }
}

async function createAsaasCheckout({ ref, value, description, productName, quantity }) {
  ensure();
  const numericValue = Number(String(value).replace(',', '.'));
  if (!Number.isFinite(numericValue) || numericValue <= 0) throw new Error(`Valor inválido para checkout: ${value}`);
  try {
    const headers = asaasHeaders();
    const publicUrl = process.env.RENDER_EXTERNAL_URL || 'https://shadow-games-bot-na47.onrender.com';
    const response = await axios.post(`${asaasBase()}/checkouts`, {
      billingTypes: ['PIX'], chargeTypes: ['DETACHED'], minutesToExpire: 10,
      externalReference: ref,
      callback: { cancelUrl: publicUrl, expiredUrl: publicUrl, successUrl: publicUrl },
      items: [{ name: String(productName || 'Pedido Shadow Games').slice(0, 100), description: String(description).slice(0, 255), quantity: Number(quantity) || 1, value: Number(numericValue.toFixed(2)) }]
    }, { headers, timeout: 15000 });
    const checkoutId = response.data?.id;
    if (!checkoutId) throw new Error('Asaas não retornou o ID do checkout.');
    const checkoutUrl = `https://asaas.com/checkoutSession/show?id=${encodeURIComponent(checkoutId)}`;
    recordCharge(ref, { provider: 'asaas', checkoutId, externalReference: ref, status: 'PENDING' });
    return { id: checkoutId, checkoutUrl };
  } catch (error) {
    throw error.response ? asaasError(error, 'criar-checkout') : error;
  }
}

async function getAsaasPayment(id) {
  const response = await axios.get(`${asaasBase()}/payments/${encodeURIComponent(id)}`, { headers: asaasHeaders(), timeout: 15000 });
  return response.data;
}

function processWebhook(provider, body, signature) {
  ensure();
  if (provider !== db.payment.provider) return { ok: false, reason: 'provider_not_selected' };
  if (provider === 'asaas') {
    const expectedSignature = process.env.ASAAS_WEBHOOK_SECRET || db.payment.webhookSecret;
    if (!expectedSignature) return { ok: false, reason: 'webhook_secret_not_configured' };
    if (!signature || signature !== expectedSignature) return { ok: false, reason: 'invalid_signature' };
  }
  const eventId = String(body.id || body.eventId || body.txid || crypto.createHash('sha256').update(JSON.stringify(body)).digest('hex'));
  if (db.payment.events[eventId]) return { ok: true, duplicate: true };
  db.payment.events[eventId] = { provider, receivedAt: new Date().toISOString(), body };
  db.payment.lastEventAt = new Date().toISOString();
  const payment = body.payment || body;
  const checkout = body.checkout || {};
  const ref = payment.externalReference || checkout.externalReference || body.txid || body.externalReference || body.external_reference || body.paymentId;
  const status = String(payment.status || body.event || 'PAID').toUpperCase();
  const paid = ['RECEIVED', 'PAYMENT_RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH', 'CHECKOUT_PAID'].includes(status);
  if (ref && db.payment.charges[ref]) {
    db.payment.charges[ref].status = status;
    db.payment.charges[ref].providerId ||= payment.id;
  }
  save();
  return { ok: true, eventId, ref, status, paid };
}

function findChargeByProviderId(providerId) {
  ensure();
  return Object.values(db.payment.charges || {}).find(charge => String(charge.providerId) === String(providerId)) || null;
}

function getChargeByReference(ref) {
  ensure();
  return db.payment.charges[String(ref)] || null;
}

module.exports = {
  db, save, PROVIDERS, ensure, configured, select, status, createOrderRef, recordCharge,
  processWebhook, findChargeByProviderId, getChargeByReference,
  createEfiPixCharge, createEfiPaymentLink, getEfiPaymentLink, getEfiCharge, isEfiChargePaid, toMinorUnits, buildEfiChargePayload,
  createAsaasPixCharge, createAsaasCheckout, getAsaasPayment
};
