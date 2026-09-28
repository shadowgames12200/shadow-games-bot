'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const root = require('node:path').join(__dirname, '..');
const cart = fs.readFileSync(`${root}/Functions/DentroCarrinho.js`, 'utf8');
const handler = fs.readFileSync(`${root}/Eventos/Sistema De Configuracao/createCarrinho.js`, 'utf8');
const providers = fs.readFileSync(`${root}/PaymentProviders.js`, 'utf8');
const packageJson = JSON.parse(fs.readFileSync(`${root}/package.json`, 'utf8'));
const lock = JSON.parse(fs.readFileSync(`${root}/package-lock.json`, 'utf8'));
const verification = fs.readFileSync(`${root}/Functions/VerficarPagamento.js`, 'utf8');
const saleHandler = fs.readFileSync(`${root}/Eventos/Sistema De Configuracao/configVenda.js`, 'utf8');
const defaultConfig = JSON.parse(fs.readFileSync(`${root}/DataBaseJson/configuracao.json`, 'utf8'));
assert.equal(packageJson.dependencies.mercadopago, undefined);
assert.equal(packageJson.dependencies['mp-webhook-portable'], undefined);
assert.equal(lock.packages['node_modules/mercadopago'], undefined);
assert.equal(lock.packages['node_modules/mp-webhook-portable'], undefined);
assert.equal(fs.existsSync(`${root}/ComandosSlash/Administracao/ganerate_pix.js`), false);
assert.equal(fs.existsSync(`${root}/Functions/Varredura.js`), false);
assert.equal(defaultConfig.pagamentos.MpAPI, undefined);
assert(!saleHandler.includes('api.mercadopago.com'), 'sale handler must not call Mercado Pago');
assert(saleHandler.includes('Este botão antigo de estorno foi desativado'), 'old refund buttons must fail safely');
assert(!verification.includes('.setCustomId(`refoundd_'), 'new payment notices must not expose the legacy refund button');
assert(cart.includes("setCustomId('pagarpix')"));
assert(cart.includes("setCustomId('pagarcartao')"));
assert(cart.includes("setCustomId('pagarinternacional')"));
assert(cart.includes("setCustomId('voltarcarrinho')"));
const buttonEmojis = [
    ['EMOJI_PIX', '1554175847601147966', 'emoji_42', 'pagarpix'],
    ['EMOJI_CARD', '1554175727937527818', 'emoji_41', 'pagarcartao'],
    ['EMOJI_CURRENCY', '1554176158835277875', 'emoji_43', 'pagarinternacional'],
    ['EMOJI_BACK', '1554175586589614260', 'emoji_40', 'voltarcarrinho']
];
for (const [variable, id, name, customId] of buttonEmojis) {
    assert(cart.includes(`const ${variable} = process.env.${variable} || { id: '${id}', name: '${name}' };`), `${variable} must use the selected server emoji`);
    assert(new RegExp(`setCustomId\\('${customId}'\\)[^\\n]*\\.setEmoji\\(${variable}\\)`).test(cart), `${customId} must use ${variable}`);
}
assert(cart.includes('REVOLUT_EUR_DETAILS'));
assert(cart.includes('REVOLUT_USD_DETAILS'));
assert(handler.includes("customId == 'comprovanteinternacional'"));
assert(providers.includes('createEfiPaymentLink'));
assert(providers.includes('cobrancas.api.efipay.com.br'));
assert(cart.includes('createEfiPixCharge'), 'Efí Pix checkout must remain connected to the cart');
console.log('payment-options=ok');
