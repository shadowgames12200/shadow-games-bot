const assert = require('node:assert/strict');
const Module = require('node:module');
const path = require('node:path');

const persistedOwners = new Map();
const sentMessages = [];

class Builder {
  addComponents() { return this; }
  addOptions() { return this; }
  setCustomId() { return this; }
  setTitle() { return this; }
  setLabel() { return this; }
  setPlaceholder() { return this; }
  setStyle() { return this; }
  setRequired() { return this; }
  setMaxLength() { return this; }
  setEmoji() { return this; }
}

const fakeDiscord = {
  ActionRowBuilder: Builder,
  StringSelectMenuBuilder: Builder,
  ButtonBuilder: Builder,
  ModalBuilder: Builder,
  TextInputBuilder: Builder,
  EmbedBuilder: Builder,
  ButtonStyle: { Secondary: 2, Primary: 1, Danger: 4, Success: 3, Link: 5 },
  TextInputStyle: { Short: 1, Paragraph: 2 },
  PermissionFlagsBits: { Administrator: 8n, ManageChannels: 16n }
};
const fakeDatabase = {
  configuracao: { get: () => '' },
  estatisticas: { fetchAll: () => [] },
  tickets: {
    get(key) {
      const prefix = 'tickets.threadOwners.';
      return key.startsWith(prefix) ? persistedOwners.get(key.slice(prefix.length)) : undefined;
    },
    set(key, value) {
      const prefix = 'tickets.threadOwners.';
      if (key.startsWith(prefix)) persistedOwners.set(key.slice(prefix.length), value);
      return value;
    }
  }
};

const originalLoad = Module._load;
Module._load = function load(request, parent, isMain) {
  if (request === 'discord.js') return fakeDiscord;
  if (request === './DataBaseJson' && parent?.filename.endsWith(`${path.sep}LegacyTicketStaff.js`)) return fakeDatabase;
  if (request === './config.json' && parent?.filename.endsWith(`${path.sep}LegacyTicketStaff.js`)) return { owner: '' };
  if (request === './Functions/CreateTicket' && parent?.filename.endsWith(`${path.sep}LegacyTicketStaff.js`)) return {};
  return originalLoad.call(this, request, parent, isMain);
};
let staffTickets;
try {
  staffTickets = require('../LegacyTicketStaff');
} finally {
  Module._load = originalLoad;
}

const openerId = '123456789012345678';
const botId = '999999999999999999';
const otherId = '222222222222222222';
let sequence = 0;

async function selectOption({ actorId, option, nameOwner = openerId, ownerId = botId, storedOwner }) {
  const threadId = `thread-${++sequence}`;
  if (storedOwner) persistedOwners.set(threadId, storedOwner);
  const channel = {
    id: threadId,
    name: nameOwner ? `Dúvidas・cliente・${nameOwner}` : 'Dúvidas・ticket-renomeado',
    ownerId,
    isThread: () => true,
    send: async message => { sentMessages.push({ threadId, message }); }
  };
  const replies = [];
  let shownModal = false;
  const interaction = {
    channel,
    guild: { ownerId: '' },
    user: { id: actorId },
    customId: 'ticket_client_options',
    values: [option],
    isButton: () => false,
    isStringSelectMenu: () => true,
    isModalSubmit: () => false,
    reply: async payload => { replies.push(payload); return payload; },
    showModal: async () => { shownModal = true; }
  };
  const handled = await staffTickets.handle(interaction);
  return { threadId, handled, replies, shownModal };
}

(async () => {
  for (const option of ['payment', 'update', 'info']) {
    const allowed = await selectOption({ actorId: openerId, option });
    assert.equal(allowed.handled, true, `${option} selection should be handled`);
    assert.match(allowed.replies[0].content, /Solicitação enviada/);
    assert.equal(persistedOwners.get(allowed.threadId), openerId, 'legacy owner should be migrated into the JSON-backed store');

    const denied = await selectOption({ actorId: otherId, option });
    assert.equal(denied.handled, true, `${option} selection from another user should be handled`);
    assert.match(denied.replies[0].content, /Apenas o cliente que abriu este ticket/);
  }

  const addMember = await selectOption({ actorId: openerId, option: 'add_member' });
  assert.equal(addMember.shownModal, true, 'the opener should be able to use the add-member dropdown option');
  const deniedAddMember = await selectOption({ actorId: otherId, option: 'add_member' });
  assert.match(deniedAddMember.replies[0].content, /Apenas o cliente que abriu este ticket/);

  const persistedOnly = await selectOption({
    actorId: openerId,
    option: 'payment',
    nameOwner: '',
    storedOwner: openerId
  });
  assert.match(persistedOnly.replies[0].content, /Solicitação enviada/, 'a JSON-persisted opener should still be recognized after a thread rename');

  console.log('ticket-owner=ok');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
