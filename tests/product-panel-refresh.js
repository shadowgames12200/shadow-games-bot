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

const salesSource = fs.readFileSync(
  path.join(__dirname, '../Eventos/Sistema De Configuracao/configVenda.js'),
  'utf8',
);
const syncStart = salesSource.indexOf("if (interaction.customId == 'syncproduto')");
assert.notEqual(syncStart, -1, 'handler do botão Sincronizar deve existir');
const syncEnd = salesSource.indexOf("if (interaction.customId == 'colocarvenda')", syncStart);
assert.notEqual(syncEnd, -1, 'limite do handler de sincronização deve existir');
const syncHandler = salesSource.slice(syncStart, syncEnd);
assert.match(syncHandler, /const result = await UpdateMessageProduto\(client, ggg\.name\)/,
  'o handler precisa receber a contagem real de mensagens sincronizadas');
assert.match(syncHandler, /result\.tracked === 0[\s\S]*Use “Postar”/,
  'quando não há mensagens vinculadas, deve orientar a publicar um painel novo');
assert.match(syncHandler, /result\.updated > 0[\s\S]*result\.failed/,
  'a confirmação deve informar atualizações e falhas reais');

const senderSource = fs.readFileSync(
  path.join(__dirname, '../Functions/SenderMessagesOrUpdates.js'),
  'utf8',
);
assert.match(senderSource, /const syncResult = \{ tracked: publishedMessages\.length, updated: 0, failed: 0, deleted: 0 \}/,
  'o atualizador deve iniciar com contagens explícitas');
assert.match(senderSource, /if \(publishedMessages\.length === 0\) return syncResult/,
  'sem IDs de mensagens salvos, o atualizador deve informar que não sincronizou nada');
assert.match(senderSource, /syncResult\.updated\+\+/,
  'cada mensagem editada deve ser contada como sincronizada');

console.log('product-panel-refresh=ok');
