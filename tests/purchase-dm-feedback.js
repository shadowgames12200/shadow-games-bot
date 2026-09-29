'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const data = new Map();
const logMessages = [];
const logChannel = {
  guild: { id: '234567890123456789' },
  async send(payload) { logMessages.push(payload); return payload; }
};
const fakeDatabase = {
  configuracao: { get: key => key === 'ConfigChannels.feedback' ? '345678901234567890' : undefined },
  estatisticas: { fetchAll: () => [] },
  tickets: { get: key => data.get(`ticket:${key}`), set: (key, value) => data.set(`ticket:${key}`, value) },
  avaliacoes: {
    get: key => data.get(`rating:${key}`),
    set: (key, value) => { data.set(`rating:${key}`, value); return value; }
  }
};
const originalLoad = Module._load;
Module._load = function load(request, parent, isMain) {
  const filename = parent?.filename || '';
  if (request === './DataBaseJson' && filename === path.join(root, 'LegacyTicketStaff.js')) return fakeDatabase;
  if (request === './Functions/CreateTicket' && filename === path.join(root, 'LegacyTicketStaff.js')) {
    return { createTicketFromModal: async () => {}, CreateTicket: async () => {}, openForm: () => ({}) };
  }
  if (request === './Functions/TicketTranscript' && filename === path.join(root, 'LegacyTicketStaff.js')) {
    return { collectMessages: async () => ({ messages: [], incomplete: false }), renderTranscript: () => '' };
  }
  if (request === './config.json' && filename === path.join(root, 'LegacyTicketStaff.js')) return { owner: '' };
  return originalLoad.call(this, request, parent, isMain);
};
let legacy;
try {
  legacy = require('../LegacyTicketStaff');
} finally {
  Module._load = originalLoad;
}

function makeInteraction(customId, userId) {
  const calls = [];
  return {
    customId,
    user: { id: userId, tag: 'Cliente#0001' },
    guildId: null,
    guild: null,
    client: {
      channels: {
        async fetch(channelId) {
          assert.equal(channelId, '345678901234567890');
          return logChannel;
        }
      }
    },
    isButton: () => true,
    calls,
    async deferUpdate() { calls.push(['deferUpdate']); },
    async editReply(payload) { calls.push(['editReply', payload]); },
    async reply(payload) { calls.push(['reply', payload]); }
  };
}

async function main() {
  const buyerId = '123456789012345678';
  const guildId = '234567890123456789';
  const orderId = 'pay_order_42';
  const customId = `avaliar_5_v2_${buyerId}_${guildId}_${orderId}`;
  const interaction = makeInteraction(customId, buyerId);

  assert.equal(await legacy.handle(interaction), true, 'o dispatcher do bot deve encaminhar o botão de feedback ao handler da DM');
  assert.deepEqual(interaction.calls.map(call => call[0]), ['deferUpdate', 'editReply'], 'o botão deve ser confirmado sem deixar o Discord expirar');
  assert.match(interaction.calls[1][1].content, /5\/5/);
  assert.deepEqual(interaction.calls[1][1].components, [], 'após a nota, os botões devem ser removidos da DM');

  const saved = [...data.entries()].find(([key]) => key.startsWith('rating:'))?.[1];
  assert.deepEqual(
    { orderId: saved.orderId, userId: saved.userId, guildId: saved.guildId, rating: saved.rating, source: saved.source },
    { orderId, userId: buyerId, guildId, rating: 5, source: 'purchase_dm' }
  );
  assert.equal(logMessages.length, 1, 'uma avaliação deve gerar um único registro no canal configurado');
  assert.equal(logMessages[0].embeds[0].data.title, 'Nova avaliação de compra');
  assert.deepEqual(logMessages[0].allowedMentions.parse, [], 'o log não deve notificar o cliente');

  const duplicate = makeInteraction(`avaliar_4_v2_${buyerId}_${guildId}_${orderId}`, buyerId);
  await legacy.handlePurchaseRating(duplicate);
  assert.match(duplicate.calls[1][1].content, /já foi registrada/);
  assert.equal(logMessages.length, 1, 'cliques repetidos não podem substituir a nota nem duplicar o log');

  const unauthorized = makeInteraction(`avaliar_1_v2_999999999999999999_${guildId}_other-order`, buyerId);
  await legacy.handlePurchaseRating(unauthorized);
  assert.equal(unauthorized.calls[0][0], 'reply');
  assert.equal(data.size, 1, 'um usuário não pode registrar uma nota enviada a outra conta');

  const legacyButton = makeInteraction('avaliar_3_old_order_with_underscores', buyerId);
  await legacy.handlePurchaseRating(legacyButton);
  assert.equal(legacyButton.calls[0][0], 'deferUpdate', 'botões antigos ainda devem funcionar após o deploy');
  assert.equal([...data.entries()].filter(([key]) => key.startsWith('rating:')).length, 2);
  assert.equal(logMessages.length, 1, 'botões antigos sem servidor embutido não devem ser enviados ao log errado');

  const unrelated = makeInteraction('ticket_rating_5_123456789012345678', buyerId);
  assert.equal(await legacy.handlePurchaseRating(unrelated), false, 'o handler de feedback não deve interceptar avaliações de tickets');

  const deliverySource = fs.readFileSync(path.join(root, 'Functions/AprovarPagamento.js'), 'utf8');
  assert(deliverySource.includes('avaliar_${n}_v2_${member.id}_${yy.guild.id}_${entrega.data.id}'));
  assert(deliverySource.includes('Escolha uma nota para avaliar sua experiência'));

  console.log('purchase-dm-feedback=ok');
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
