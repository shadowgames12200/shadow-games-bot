'use strict';

const assert = require('node:assert/strict');
const Module = require('node:module');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const values = new Map();
const logCalls = { set: [], send: [] };
const fakeTickets = {
  get(key) {
    if (values.has(key)) return values.get(key);
    if (key.startsWith('tickets.staffConfig.')) {
      return values.get('tickets.staffConfig')?.[key.slice('tickets.staffConfig.'.length)];
    }
    return undefined;
  },
  set(key, value) { values.set(key, value); return value; },
  delete(key) { return values.delete(key); }
};
const fakeDatabase = {
  tickets: fakeTickets,
  configuracao: { get: () => undefined },
  estatisticas: { fetchAll: () => [] }
};
const fakeLogs = {
  status: () => ({ channels: { ticket_aberto: '' } }),
  setChannel: (...args) => { logCalls.set.push(args); return {}; },
  send: async (...args) => { logCalls.send.push(args); return true; }
};

const originalLoad = Module._load;
Module._load = function load(request, parent, isMain) {
  const filename = parent?.filename || '';
  if (request === './DataBaseJson' && filename === path.join(root, 'LegacyTicketStaff.js')) return fakeDatabase;
  if (request === '../DataBaseJson' && filename === path.join(root, 'Functions', 'CreateTicket.js')) return fakeDatabase;
  if (request === '../LogSuite' && filename === path.join(root, 'Functions', 'CreateTicket.js')) return fakeLogs;
  if (request === './config.json' && filename === path.join(root, 'LegacyTicketStaff.js')) return { owner: '' };
  return originalLoad.call(this, request, parent, isMain);
};
let legacy;
let createTicket;
try {
  legacy = require('../LegacyTicketStaff');
  createTicket = require('../Functions/CreateTicket');
} finally {
  Module._load = originalLoad;
}
const { collectMessages } = require('../Functions/TicketTranscript');

function makeMessages(count, threadId) {
  const base = Date.now() - count * 1000;
  return Array.from({ length: count }, (_, index) => {
    const messageId = String(10000000000000000n + BigInt(index + 1));
    const message = {
      id: messageId,
      channelId: threadId,
      createdTimestamp: base + index * 1000,
      author: {
        id: index === 0 ? '123456789012345678' : `user-${index}`,
        tag: index === 0 ? '<Cliente>' : `Atendente ${index}`,
        username: index === 0 ? '<Cliente>' : `Atendente ${index}`,
        bot: index === 2,
        displayAvatarURL: () => 'https://cdn.discordapp.com/avatars/123/avatar.png'
      },
      cleanContent: index === 0 ? '<script>alert("x")</script>' : `mensagem de teste ${index}`,
      content: index === 0 ? '<script>alert("x")</script>' : `mensagem de teste ${index}`,
      attachments: new Map(),
      embeds: [],
      reference: null
    };
    if (index === 1) {
      message.attachments = new Map([['file-1', {
        name: 'comprovante.png', url: 'https://cdn.discordapp.com/attachments/1/2/comprovante.png',
        contentType: 'image/png', size: 2048
      }]]);
    }
    if (index === 2) message.embeds = [{ title: 'Detalhes <do pedido>', description: 'campo & descrição', fields: [{ name: 'ID', value: '123' }] }];
    if (index === 3) message.reference = { messageId: String(10000000000000001n) };
    return message;
  });
}

function makeThread(messages) {
  const thread = {
    id: '123456789012345678',
    guildId: '234567890123456789',
    name: 'Suporte ao Cliente・cliente・123456789012345678',
    createdTimestamp: messages[0]?.createdTimestamp || Date.now(),
    guild: { id: '234567890123456789', name: 'Servidor de teste' },
    messages: {
      async fetch({ limit = 100, before } = {}) {
        const beforeId = before ? BigInt(before) : null;
        const eligible = messages
          .filter(message => !beforeId || BigInt(message.id) < beforeId)
          .sort((a, b) => BigInt(a.id) > BigInt(b.id) ? -1 : 1)
          .slice(0, limit);
        return { size: eligible.length, values: () => eligible.values() };
      }
    }
  };
  return thread;
}

async function main() {
  const threadId = '123456789012345678';
  const openerId = '123456789012345678';
  values.set('tickets.staffConfig', { logChannelId: '345678901234567890', transcriptChannelId: '' });

  const openingInteraction = {
    guild: { id: '234567890123456789', name: 'Servidor de teste' },
    user: { id: openerId, tag: 'Cliente#0001', username: 'Cliente' }
  };
  const openingThread = { id: threadId, name: 'Suporte ao Cliente・cliente・' + openerId, createdTimestamp: Date.now() };
  createTicket.recordTicketOpening(openingThread, openingInteraction, 'Suporte ao Cliente');
  assert.equal(values.get(`tickets.staffState.${threadId}`).category, 'Suporte ao Cliente');
  assert.equal(values.get(`tickets.staffState.${threadId}`).ownerId, openerId);

  const logged = await createTicket.sendTicketOpenLog(openingInteraction, openingThread, 'Suporte ao Cliente');
  assert.equal(logged, true);
  assert.equal(logCalls.set[0][1], 'ticket_aberto');
  assert.equal(logCalls.set[0][2], '345678901234567890');
  assert.equal(logCalls.send[0][1], 'ticket_aberto');
  assert.equal(logCalls.send[0][2].data.title, 'Novo ticket aberto');

  const messages = makeMessages(105, threadId);
  const thread = makeThread(messages);
  values.set(`tickets.threadOwners.${threadId}`, openerId);
  values.set(`tickets.staffState.${threadId}`, {
    status: 'resolvido', priority: 'normal', category: 'Suporte ao Cliente',
    ownerId: openerId, ownerTag: '<Cliente>', openedAt: messages[0].createdTimestamp,
    closedBy: '999999999999999999', closedByTag: 'Atendente', closedAt: Date.now(), linkedPurchase: 'PED-123'
  });

  const fetched = await collectMessages(thread);
  assert.equal(fetched.messages.length, 105, 'o coletor deve paginar além das 100 mensagens mais recentes');
  assert.equal(fetched.incomplete, false);

  const transcript = await legacy.buildTranscript(thread);
  const html = transcript.attachment.toString('utf8');
  assert.equal(transcript.messageCount, 105);
  assert.match(transcript.name, /^transcript-123456789012345678\.html$/);
  assert.match(html, /Histórico da conversa/);
  assert.match(html, /Suporte ao Cliente/);
  assert.match(html, /105 mensagens/);
  assert.match(html, /&lt;script&gt;alert\(&quot;x&quot;\)&lt;\/script&gt;/, 'conteúdo do usuário deve estar escapado para HTML');
  assert.doesNotMatch(html, /<script>alert/);
  assert.match(html, /comprovante\.png/);
  assert.match(html, /Detalhes &lt;do pedido&gt;/);
  assert.match(html, /Encerrado por/);

  const transcriptUrl = 'https://cdn.discordapp.com/attachments/345/678/transcript.html?signature=test';
  const dmPayloads = [];
  const owner = {
    async send(payload) {
      dmPayloads.push(payload);
      return payload.files?.length
        ? { attachments: { first: () => ({ url: transcriptUrl }) } }
        : { attachments: { first: () => undefined } };
    }
  };
  const closingInteraction = {
    channel: thread,
    user: { id: '999999999999999999', tag: 'Atendente#0001', username: 'Atendente' },
    client: {
      users: { fetch: async id => id === openerId ? owner : null },
      channels: { fetch: async () => null }
    }
  };
  const delivery = await legacy.sendTranscript(closingInteraction, true);
  assert.equal(delivery.sent.transcript, true, 'sem canal configurado, o transcript deve ser preservado por DM');
  assert.equal(delivery.sent.user, true);
  assert.equal(delivery.transcriptUrl, transcriptUrl);
  assert.equal(dmPayloads.length, 2, 'a DM deve receber o HTML e o cartão final');
  assert.equal(dmPayloads[0].files[0].name, transcript.name);
  const linkButton = dmPayloads[1].components[1].components[0];
  assert.equal(linkButton.data.url, transcriptUrl, 'o cartão deve conter link para abrir o HTML');

  values.set('tickets.staffConfig', { logChannelId: '345678901234567890', transcriptChannelId: '456789012345678901' });
  dmPayloads.length = 0;
  const channelPayloads = [];
  const targetChannel = {
    isTextBased: () => true,
    async send(payload) {
      channelPayloads.push(payload);
      return payload.files?.length
        ? { attachments: { first: () => ({ url: transcriptUrl }) } }
        : { attachments: { first: () => undefined } };
    }
  };
  closingInteraction.client.channels.fetch = async () => targetChannel;
  const channelDelivery = await legacy.sendTranscript(closingInteraction, true);
  assert.equal(channelDelivery.sent.channel, true);
  assert.equal(channelDelivery.sent.transcript, true);
  assert.equal(channelPayloads.length, 2, 'o canal configurado deve receber o HTML e um cartão com link');
  assert.equal(channelPayloads[0].files[0].name, transcript.name);
  assert.equal(channelPayloads[1].components[0].components[0].data.url, transcriptUrl);
  assert.equal(dmPayloads.length, 1, 'com o canal configurado, o usuário recebe o cartão por DM');
  assert.equal(dmPayloads[0].components[1].components[0].data.url, transcriptUrl);

  console.log('ticket-logs-transcripts=ok');
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
