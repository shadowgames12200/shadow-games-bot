'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '../Functions/CreateTicket.js'), 'utf8');

assert.doesNotMatch(
  source,
  /aberturaCooldown|30000|aguarde alguns segundos antes de abrir outro ticket/i,
  'os fluxos de painel e formulário não devem impor um cooldown de abertura'
);
assert.equal(
  (source.match(/const existing = interaction\.channel\.threads\.cache\.find/g) || []).length,
  2,
  'a proteção contra um segundo ticket ainda aberto deve continuar nos dois fluxos'
);
assert.match(source, /Você já possu[ií] um ticket aberto/i);

console.log('ticket-open-policy=ok');
