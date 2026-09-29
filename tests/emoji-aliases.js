'use strict';

const assert = require('node:assert/strict');
const { renderAutoEmojiAliases } = require('../Functions/RenderEmojiAliases');

function emoji(name, id, animated = false) {
  return { name, id, toString: () => `<${animated ? 'a' : ''}:${name}:${id}>` };
}

const guild = {
  emojis: {
    cache: new Map([
      ['1', emoji('ea1', '1183841001824067676')],
      ['2', emoji('ea2', '1194131420499677317')],
      ['3', emoji('ea3', '1194131474534899753', true)]
    ])
  }
};

assert.equal(
  renderAutoEmojiAliases(':ea1::ea2::ea3:', guild),
  '<:ea1:1183841001824067676><:ea2:1194131420499677317><a:ea3:1194131474534899753>',
  'aliases adjacentes devem virar o formato de emoji customizado exigido pelo Discord'
);
assert.equal(
  renderAutoEmojiAliases('Texto :ea1: e alias ausente :ea4:', guild),
  'Texto <:ea1:1183841001824067676> e alias ausente :ea4:',
  'aliases conhecidos são convertidos e aliases não encontrados são preservados'
);
assert.equal(renderAutoEmojiAliases('Texto normal', guild), 'Texto normal');
assert.equal(renderAutoEmojiAliases(':ea1:', null), ':ea1:');
assert.equal(renderAutoEmojiAliases(null, guild), null);

console.log('emoji-aliases=ok');
