const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const payments = require(path.join(root, 'PaymentProviders'));

function read(relative) {
  return fs.readFileSync(path.join(root, relative), 'utf8');
}

// Provedor operacional: apenas Asaas pode ser selecionado.
assert.throws(() => payments.select('mercadopago'), /Apenas o Asaas/);
payments.db.payment = {
  provider: 'asaas', mode: 'sandbox', webhookSecret: 'smoke-secret',
  charges: { REF_SMOKE: { providerId: 'pay_smoke', status: 'PENDING' } }, events: {}
};
const event = payments.processWebhook('asaas', {
  id: 'evt_smoke', event: 'PAYMENT_RECEIVED',
  payment: { id: 'pay_smoke', externalReference: 'REF_SMOKE', status: 'RECEIVED' }
}, 'smoke-secret');
assert.strictEqual(event.ok, true);
assert.strictEqual(event.paid, true);
assert.strictEqual(payments.db.payment.charges.REF_SMOKE.status, 'RECEIVED');
assert.strictEqual(payments.getChargeByReference('REF_SMOKE').providerId, 'pay_smoke');
assert.strictEqual(payments.processWebhook('asaas', { id: 'evt_smoke' }, 'smoke-secret').duplicate, true);
assert.strictEqual(payments.processWebhook('asaas', { id: 'evt_bad' }, 'wrong').reason, 'invalid_signature');
const configuredWebhookSecret = payments.db.payment.webhookSecret;
payments.db.payment.webhookSecret = '';
assert.strictEqual(payments.processWebhook('asaas', { id: 'evt_unconfigured' }, 'anything').reason, 'webhook_secret_not_configured');
payments.db.payment.webhookSecret = configuredWebhookSecret;

// The hosted checkout stores its local reference separately from Asaas checkout IDs.
const verifier = read('Functions/VerficarPagamento.js');
const checkout = read('Functions/DentroCarrinho.js');
assert(verifier.includes("method === 'pix' || method === 'pix_checkout'"), 'hosted PIX checkout is not processed');
assert(verifier.includes('getChargeByReference(payment.data.pagamentos.ref)'), 'hosted checkout is not correlated by local reference');
assert(checkout.includes("method: 'pix_checkout'"), 'hosted checkout method contract changed');

// Regressões conhecidas dos fluxos críticos.
const ticket = read('Functions/CreateTicket.js');
assert(!ticket.includes('if (isSupport) rows.push(...purchasePanel'), 'menu de compras duplicado no painel principal');
assert(ticket.includes("setCustomId('ticket_client_purchase')"), 'menu de compras ausente');
const client = read('LegacyTicketStaff.js');
assert(client.includes('Apenas o cliente que abriu este ticket pode usar estas opções'), 'opções sem proteção do dono');
const manual = read('ComandosSlash/Administracao/entregar.js');
assert(manual.includes('pedidos.has(interaction.channel.id)'), 'entrega manual sem proteção contra duplicidade');
const delivery = read('Functions/AprovarPagamento.js');
assert(!delivery.includes('setInterval(async () =>'), 'entrega ainda usa timer recorrente');
assert(delivery.includes('pedidos.delete(entrega.ID)'), 'fila de entrega sem remoção final');

console.log('smoke-critical=ok');
