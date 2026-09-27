'use strict';

const assert = require('node:assert/strict');
const axios = require('axios');
const payments = require('../PaymentProviders');

async function main() {
  const envNames = [
    'EFI_MODE', 'EFI_CLIENT_ID', 'EFI_CLIENT_SECRET', 'EFI_PIX_KEY',
    'EFI_CERT_P12_BASE64', 'EFI_CERT_P12_PASSWORD', 'EFI_CERT_P12_PATH',
    'EFI_CERT_BASE64', 'EFI_KEY_BASE64', 'EFI_CERT_PATH', 'EFI_KEY_PATH'
  ];
  const savedEnv = Object.fromEntries(envNames.map(name => [name, process.env[name]]));
  const oldPost = axios.post;
  const oldRequest = axios.request;
  const oldPayment = payments.db.payment;
  const calls = [];
  const txid = 'AbCdEf01234567890123456789012345';
  let chargeBody;

  try {
    for (const name of envNames) delete process.env[name];
    process.env.EFI_MODE = 'sandbox';
    payments.db.payment = { provider: '', mode: 'sandbox', charges: {}, events: {} };
    assert.equal(payments.configured('efi'), false);
    assert.throws(() => payments.select('efi', 'production'), /Configure as credenciais/);
    assert.equal(payments.select('efi', 'sandbox').provider, 'efi');

    process.env.EFI_CLIENT_ID = 'client-test';
    process.env.EFI_CLIENT_SECRET = 'secret-test';
    process.env.EFI_PIX_KEY = 'pix-key-test@example.com';
    process.env.EFI_CERT_P12_BASE64 = Buffer.from('simulated-p12-not-used-for-network').toString('base64');

    assert.equal(payments.configured('efi'), true);
    assert.equal(payments.select('efi', 'sandbox').provider, 'efi');
    assert.equal(payments.status().configured, true);
    assert.throws(() => payments.select('efi', 'live'), /Modo inválido/);

    const payload = payments.buildEfiChargePayload({ ref: 'REF_TEST', value: '12,30', description: 'Pedido REF_TEST' });
    assert.deepEqual(payload, {
      calendario: { expiracao: 600 },
      valor: { original: '12.30' },
      chave: 'pix-key-test@example.com',
      solicitacaoPagador: 'Pedido REF_TEST'
    });
    assert.equal(Object.hasOwn(payload, 'devedor'), false, 'cobrança não deve enviar CPF/CNPJ do pagador');
    assert.throws(() => payments.buildEfiChargePayload({ ref: 'x', value: 0, pixKey: 'key' }), /Valor inválido/);
    assert.throws(() => payments.buildEfiChargePayload({ ref: 'x', value: 0.001, pixKey: 'key' }), /mínimo/);

    axios.post = async (url, body, config) => {
      calls.push({ kind: 'oauth', url, body, config });
      return { data: { access_token: 'simulated-access-token', expires_in: 3600 } };
    };
    axios.request = async config => {
      calls.push({ kind: 'api', config });
      assert.equal(config.httpsAgent.options.minVersion, 'TLSv1.2');
      assert.ok(config.httpsAgent.options.pfx, 'mTLS P12 certificate should be loaded for outbound calls');
      if (config.method === 'post' && config.url.endsWith('/v2/cob')) {
        chargeBody = config.data;
        return { data: { txid, status: 'ATIVA', pixCopiaECola: '000201PIX_TEST_COPY_PASTE' } };
      }
      if (config.method === 'get' && config.url.endsWith(`/v2/cob/${txid}`)) {
        return { data: { txid, status: 'CONCLUIDA', pix: [{ valor: '12.30' }] } };
      }
      throw new Error(`Unexpected mocked API call: ${config.method} ${config.url}`);
    };

    const ref = 'SG1234567890abcdef';
    const created = await payments.createEfiPixCharge({ ref, value: 12.3, description: `Pedido ${ref}` });
    assert.equal(created.id, txid);
    assert.equal(created.qrCode, '000201PIX_TEST_COPY_PASTE');
    assert.equal(chargeBody.calendario.expiracao, 600);
    assert.equal(chargeBody.valor.original, '12.30');
    assert.equal(chargeBody.chave, 'pix-key-test@example.com');
    assert.equal(chargeBody.devedor, undefined);
    assert.equal(payments.getChargeByReference(ref).providerId, txid);
    assert.throws(() => payments.select('efi', 'production'), /cobranças Efí pendentes/);

    const charge = await payments.getEfiCharge(txid, payments.getChargeByReference(ref).mode);
    assert.equal(payments.isEfiChargePaid(charge, '12,30'), true);
    assert.equal(payments.isEfiChargePaid({ status: 'CONCLUIDA', pix: [{ valor: '12.29' }] }, 12.3), false);
    assert.equal(payments.isEfiChargePaid({ status: 'CONCLUIDA', pix: [] }, 12.3), false);
    assert.equal(payments.isEfiChargePaid({ status: 'ATIVA', pix: [{ valor: '12.30' }] }, 12.3), false);
    assert.equal(payments.toMinorUnits('12,30'), 1230);
    assert.equal(calls.filter(call => call.kind === 'oauth').length, 1, 'OAuth token should be cached between calls');
    assert.equal(calls.some(call => call.kind === 'api' && call.config.url.startsWith('https://pix-h.api.efipay.com.br/')), true);

    console.log('efi-payments=ok (mocked; no real credentials or payment requests)');
  } finally {
    axios.post = oldPost;
    axios.request = oldRequest;
    if (oldPayment === undefined) delete payments.db.payment;
    else payments.db.payment = oldPayment;
    for (const name of envNames) {
      if (savedEnv[name] === undefined) delete process.env[name];
      else process.env[name] = savedEnv[name];
    }
    payments.save();
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
