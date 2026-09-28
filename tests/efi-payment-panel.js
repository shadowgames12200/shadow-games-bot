'use strict';

const assert = require('node:assert/strict');
const config = require('../config.json');
const payments = require('../PaymentProviders');
const paymentInteractionHandler = require('../Eventos/Sistema De Configuracao/configPagamentos');

async function main() {
  const savedPayment = payments.db.payment;
  const envNames = ['EFI_CLIENT_ID', 'EFI_CLIENT_SECRET', 'EFI_PIX_KEY', 'EFI_CERT_P12_BASE64', 'EFI_CERT_P12_PATH', 'EFI_CERT_BASE64', 'EFI_CERT_PATH'];
  const savedEnv = Object.fromEntries(envNames.map(name => [name, process.env[name]]));

  try {
    for (const name of envNames) delete process.env[name];

    let prompt;
    await paymentInteractionHandler.run({
      isStringSelectMenu: () => true,
      isButton: () => false,
      customId: 'payment_provider_select',
      values: ['efi:production'],
      user: { id: config.owner },
      update: async payload => { prompt = payload; return payload; }
    }, {});
    assert.match(prompt.content, /Confirme a ativação de Efí Bank em PRODUÇÃO/);
    assert.match(prompt.content, /cobranças reais/);
    assert.equal(prompt.components[0].components[0].data.custom_id, 'confirm_payment_provider:efi:production');

    let unauthorizedReply;
    await paymentInteractionHandler.run({
      isStringSelectMenu: () => true,
      isButton: () => false,
      customId: 'payment_provider_select',
      values: ['efi:sandbox'],
      user: { id: 'not-the-owner' },
      reply: async payload => { unauthorizedReply = payload; return payload; }
    }, {});
    assert.match(unauthorizedReply.content, /não tem permissão/);
    assert.equal(unauthorizedReply.ephemeral, true);

    payments.db.payment = { provider: 'efi', mode: 'sandbox', charges: {}, events: {} };
    let blockedReply;
    await paymentInteractionHandler.run({
      isStringSelectMenu: () => false,
      isButton: () => true,
      customId: 'confirm_payment_provider:efi:production',
      user: { id: config.owner },
      reply: async payload => { blockedReply = payload; return payload; }
    }, {});
    assert.match(blockedReply.content, /Configure as credenciais de produção/);

    console.log('efi-payment-panel=ok (owner guard, production confirmation, no credentials or API requests)');
  } finally {
    if (savedPayment === undefined) delete payments.db.payment;
    else payments.db.payment = savedPayment;
    for (const name of envNames) {
      if (savedEnv[name] === undefined) delete process.env[name];
      else process.env[name] = savedEnv[name];
    }
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
