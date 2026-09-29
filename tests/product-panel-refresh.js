'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(
  path.join(__dirname, '../Eventos/Sistema De Configuracao/interacao.js'),
  'utf8',
);
const editStart = source.indexOf("if (interaction.customId === 'Editar')");
assert.notEqual(editStart, -1, 'handler de edição do produto deve existir');
const editEnd = source.indexOf('function isURL', editStart);
assert.notEqual(editEnd, -1, 'limite do handler de edição deve existir');
const editHandler = source.slice(editStart, editEnd);

assert.match(editHandler, /GerenciarProduto\(interaction, 1, ggg\.name\)/,
  'o painel administrativo continua sendo atualizado após salvar');
assert.match(editHandler, /Array\.isArray\(publishedMessages\) && publishedMessages\.length > 0/,
  'só tenta editar mensagens públicas quando existem posts salvos');
assert.match(editHandler, /await UpdateMessageProduto\(client, ggg\.name\)/,
  'o salvamento deve sincronizar os painéis públicos do produto');
assert.match(editHandler, /catch \(error\)[\s\S]*Não foi possível atualizar os painéis publicados/,
  'falha de edição pública deve ser registrada sem interromper a configuração');

console.log('product-panel-refresh=ok');
