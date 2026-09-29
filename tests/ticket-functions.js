'use strict';

const assert = require('node:assert/strict');
const {
  MAX_TICKET_FUNCTIONS,
  addTicketFunction,
  getTicketFunctions,
  getTicketPanelBlocker,
  listTicketFunctions,
  removeTicketFunction,
} = require('../Functions/TicketFunctions');

function makeDatabase(initial = {}) {
  const documents = new Map(Object.entries(initial));
  return {
    get(key) { return documents.get(key); },
    set(key, value) { documents.set(key, structuredClone(value)); return value; },
  };
}

function main() {
  const database = makeDatabase();

  // Reproduz o adaptador JSON: uma chave ainda inexistente retorna undefined, não null.
  assert.equal(database.get('tickets.funcoes'), undefined);
  assert.deepEqual(getTicketFunctions(database), {});
  assert.equal(getTicketPanelBlocker(database), 'functions');
  assert.deepEqual(addTicketFunction(database, '   ', { predescricao: 'Teste' }), { ok: false, reason: 'invalid_name' });

  const first = addTicketFunction(database, 'Suporte', {
    predescricao: 'Preciso de ajuda',
    descricao: 'Atendimento geral',
  });
  assert.deepEqual(first, { ok: true, key: 'Suporte' });
  assert.deepEqual(database.get('tickets.funcoes').Suporte, {
    nome: 'Suporte',
    predescricao: 'Preciso de ajuda',
    descricao: 'Atendimento geral',
  });
  assert.equal(listTicketFunctions(database).length, 1);
  assert.deepEqual(addTicketFunction(database, '  suporte  ', {}), { ok: false, reason: 'duplicate' });
  assert.equal(getTicketPanelBlocker(database), 'appearance');

  database.set('tickets.aparencia', { title: 'Abrir atendimento', description: 'Escolha uma opção' });
  assert.equal(getTicketPanelBlocker(database), null);

  assert.equal(removeTicketFunction(database, 'SUPORTE'), true, 'remoção deve encontrar o nome sem diferenciar maiúsculas/minúsculas');
  assert.deepEqual(database.get('tickets.funcoes'), {});
  assert.equal(getTicketPanelBlocker(database), 'functions');
  assert.equal(removeTicketFunction(database, 'SUPORTE'), false, 'remover novamente deve indicar corretamente que não existe');

  // Pontos em nomes não devem virar segmentos de caminho do adaptador JSON.
  assert.equal(addTicketFunction(database, 'Financeiro.VIP', { predescricao: 'Pagamentos' }).ok, true);
  assert.ok(Object.hasOwn(database.get('tickets.funcoes'), 'Financeiro.VIP'));
  assert.equal(removeTicketFunction(database, 'Financeiro.VIP'), true);

  const fullDatabase = makeDatabase({
    'tickets.funcoes': Object.fromEntries(Array.from({ length: MAX_TICKET_FUNCTIONS }, (_, index) => {
      const name = `Funcao ${index + 1}`;
      return [name, { nome: name, predescricao: 'Teste' }];
    })),
  });
  assert.deepEqual(addTicketFunction(fullDatabase, 'Extra', { predescricao: 'Teste' }), { ok: false, reason: 'limit_reached' });
  assert.equal(listTicketFunctions(fullDatabase).length, MAX_TICKET_FUNCTIONS);

  console.log('ticket-functions=ok');
}

main();
