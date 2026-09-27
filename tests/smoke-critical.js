const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const payments = require(path.join(root, 'PaymentProviders'));

function read(relative) {
  return fs.readFileSync(path.join(root, relative), 'utf8');
}

// Provedores ativos: Efí e Asaas; provedores ainda sem checkout não podem ser selecionados.
assert.throws(() => payments.select('mercadopago'), /Provedor ainda não habilitado/);
assert.throws(() => payments.select('inter'), /Provedor ainda não habilitado/);
assert.equal(payments.select('efi', 'sandbox').provider, 'efi');
assert.equal(payments.status().configured, false, 'Efí must remain unconfigured until environment secrets are supplied');
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
assert(checkout.includes('createEfiPixCharge'), 'Efí Pix charge creation is not connected to the cart');
assert(checkout.includes('QRCode.toBuffer(charge.qrCode'), 'Efí QR image is not generated');
assert(checkout.includes("setCustomId('codigocopiaecola')"), 'Efí Pix Copia e Cola button is missing');
assert(verifier.includes('getEfiCharge(localCharge.providerId'), 'Efí payment status is not verified against its API');
assert(verifier.includes('isEfiChargePaid(res.data'), 'Efí delivery is not guarded by exact received amount');

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
