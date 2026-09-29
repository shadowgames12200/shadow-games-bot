'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { produtos } = require('../DataBaseJson');
const { Gerenciar2 } = require('../Functions/Painel');
const { painelTicket } = require('../Functions/PainelTickets');

function makeInteraction() {
  const updates = [];
  return {
    guild: {
      name: 'Guild de teste',
      iconURL: () => 'https://example.com/guild.png',
    },
    user: { username: 'Admin de teste' },
    updates,
    async update(payload) {
      updates.push(payload);
      return payload;
    },
  };
}

async function main() {
  assert.equal(typeof produtos.fetchAll, 'function', 'o adaptador JSON fornece fetchAll');

  const salesInteraction = makeInteraction();
  await Gerenciar2(salesInteraction, {});
  assert.equal(salesInteraction.updates.length, 1, 'o painel de vendas deve atualizar a interação');
  assert.equal(salesInteraction.updates[0].embeds[0].data.title, 'Painel de Administração');
  assert.equal(salesInteraction.updates[0].components.length, 2);

  // A aparência vazia reproduz o JSON de tickets atual em produção.
  const ticketInteraction = makeInteraction();
  await painelTicket(ticketInteraction);
  assert.equal(ticketInteraction.updates.length, 1, 'o painel de tickets deve atualizar a interação');
  assert.equal(ticketInteraction.updates[0].embeds[0].data.title, undefined);
  assert.equal(ticketInteraction.updates[0].embeds[0].data.description, undefined);
  assert.equal(ticketInteraction.updates[0].components.length, 3);

  const dispatcher = fs.readFileSync(
    path.join(__dirname, '../Eventos/Sistema De Configuracao/painel.js'),
    'utf8',
  );
  assert.match(dispatcher, /return await painelTicket\(interaction\)/);
  assert.match(dispatcher, /return await Gerenciar2\(interaction, client\)/);

  console.log('botconfig-panels=ok');
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
