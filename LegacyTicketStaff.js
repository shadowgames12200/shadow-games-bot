const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  EmbedBuilder,
  PermissionFlagsBits
} = require('discord.js');
const { configuracao, estatisticas, tickets } = require('./DataBaseJson');

const QUICK_REPLIES = {
  pagamento: 'Olá! Vou verificar o pagamento e retorno com uma atualização em breve.',
  entrega: 'Olá! Vou consultar o status da entrega do seu pedido.',
  prazo: 'O prazo depende do produto e da confirmação do pagamento. Vou verificar para você.',
  troca: 'Vou analisar as condições da troca e já retorno com os próximos passos.',
  garantia: 'Vou conferir as informações da garantia do seu produto.'
};
const STATUSES = [
  ['aberto', 'Aberto', '🟢'],
  ['atendimento', 'Em atendimento', '🔵'],
  ['aguardando', 'Aguardando cliente', '🟡'],
  ['resolvido', 'Resolvido', '✅']
];
const PRIORITIES = [
  ['baixa', 'Baixa', '🟢'],
  ['normal', 'Normal', '🔵'],
  ['alta', 'Alta', '🟠'],
  ['urgente', 'Urgente', '🔴']
];

function config() {
  const current = tickets.get('tickets.staffConfig') || {};
  const value = {
    title: 'Painel interno do atendimento',
    description: 'Use as opções abaixo para gerenciar este ticket.',
    transcriptChannelId: configuracao.get('ConfigChannels.logpedidos') || configuracao.get('ConfigChannels.eventbuy') || '',
    staffRoleIds: [],
    quickReplies: QUICK_REPLIES,
    ...current
  };
  value.staffRoleIds = Array.isArray(value.staffRoleIds) ? value.staffRoleIds : [];
  value.quickReplies = { ...QUICK_REPLIES, ...(value.quickReplies || {}) };
  tickets.set('tickets.staffConfig', value);
  return value;
}

function threadOwner(thread) {
  return String(thread?.ownerId || String(thread?.name || '').split('・').pop() || '');
}

function isLegacyThread(channel) {
  return Boolean(channel?.isThread?.() && threadOwner(channel));
}

function roleIds() {
  const c = config();
  return [...new Set([
    configuracao.get('ConfigRoles.cargoadm'),
    configuracao.get('ConfigRoles.cargosup'),
    ...c.staffRoleIds
  ].filter(Boolean).map(String))];
}

function isStaff(interaction) {
  return Boolean(
    interaction.memberPermissions?.has(PermissionFlagsBits.Administrator) ||
    interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels) ||
    roleIds().some(id => interaction.member?.roles?.cache?.has(id))
  );
}

function state(thread) {
  const key = `tickets.staffState.${thread.id}`;
  const current = tickets.get(key) || { status: 'aberto', priority: 'normal', claimedBy: '', linkedPurchase: '', transfer: '' };
  tickets.set(key, current);
  return current;
}

function saveState(thread, patch) {
  const next = { ...state(thread), ...patch };
  tickets.set(`tickets.staffState.${thread.id}`, next);
  return next;
}

function controlRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ticket_notify').setLabel('Notificar solicitante').setEmoji('🔔').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('ticket_claim').setLabel('Assumir Ticket').setEmoji('🔒').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('ticket_transcript').setLabel('Salvar transcript').setEmoji('📄').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('ticket_close').setLabel('Fechar e Salvar').setEmoji('🔒').setStyle(ButtonStyle.Danger)
  );
}

function toolsRow() {
  return new ActionRowBuilder().addComponents(new StringSelectMenuBuilder()
    .setCustomId('ticket_staff_options')
    .setPlaceholder('Mais ferramentas do atendimento')
    .addOptions(
      { label: 'Transferir atendimento', description: 'Adicionar um atendente ou cargo ao ticket', value: 'transfer', emoji: '🔁' },
      { label: 'Alterar status', description: 'Atualizar o andamento do ticket', value: 'status', emoji: '📌' },
      { label: 'Definir prioridade', description: 'Marcar a urgência do atendimento', value: 'priority', emoji: '🚦' },
      { label: 'Respostas rápidas', description: 'Enviar uma resposta pronta', value: 'quick', emoji: '⚡' },
      { label: 'Compras vinculadas', description: 'Consultar e vincular uma compra', value: 'purchases', emoji: '🛒' },
      { label: 'Controle de cargos', description: 'Adicionar ou remover um cargo do ticket', value: 'roles', emoji: '🛡️' }
    ));
}

async function staffPanel(interaction) {
  if (!isLegacyThread(interaction.channel)) return interaction.reply({ content: '❌ Use `/ticket staff` dentro de uma thread privada do sistema antigo.', ephemeral: true });
  if (!isStaff(interaction)) return interaction.reply({ content: '❌ Apenas a equipe autorizada pode abrir o painel interno.', ephemeral: true });
  const c = config();
  const s = state(interaction.channel);
  return interaction.reply({ ephemeral: true, content: `🛠️ **${c.title}**\nStatus: **${s.status}** | Prioridade: **${s.priority}**`, components: [controlRow(), toolsRow()] });
}

function choiceMenu(id, placeholder, choices) {
  return { components: [new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId(id).setPlaceholder(placeholder).addOptions(choices.map(([value, label, emoji]) => ({ value, label, emoji }))))] };
}

function transferModal() {
  return new ModalBuilder().setCustomId('ticket_transfer_modal').setTitle('Transferir atendimento').addComponents(
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('ticket_transfer_user').setLabel('ID do atendente (opcional)').setStyle(TextInputStyle.Short).setRequired(false).setMaxLength(25)),
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('ticket_transfer_role').setLabel('ID do cargo (opcional)').setStyle(TextInputStyle.Short).setRequired(false).setMaxLength(25))
  );
}

function roleModal() {
  return new ModalBuilder().setCustomId('ticket_role_modal').setTitle('Controle de cargos').addComponents(
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('ticket_role_id').setLabel('ID do cargo').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(25)),
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('ticket_role_action').setLabel('Ação: adicionar ou remover').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(10))
  );
}

function purchasesMenu(thread) {
  const owner = threadOwner(thread);
  const list = estatisticas.fetchAll().map(item => ({ key: item.ID, ...item.data })).filter(item => String(item.userid) === owner).slice(0, 25);
  if (!list.length) return { content: '🛒 Nenhuma compra encontrada para o dono desta thread.', ephemeral: true };
  return { content: '🛒 Selecione a compra que deseja vincular a este ticket.', ephemeral: true, components: [new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId('ticket_purchase_link').setPlaceholder('Selecione uma compra').addOptions(list.map((p, i) => ({ value: String(p.key), label: `${i + 1}. ${String(p.produto || 'Produto').slice(0, 80)}`, description: `Pedido ${p.idpagamento || p.key}`.slice(0, 100) }))))] };
}

function publicPanel(interaction) {
  const appearance = tickets.get('tickets.aparencia') || {};
  const functions = tickets.get('tickets.funcoes') || {};
  const embed = new EmbedBuilder()
    .setTitle(appearance.title || 'Atendimento')
    .setDescription(appearance.description || 'Selecione uma opção para abrir seu atendimento.')
    .setFooter({ text: interaction.guild.name })
    .setTimestamp();
  if (appearance.color) embed.setColor(appearance.color);
  if (appearance.banner) embed.setImage(appearance.banner);
  const entries = Object.entries(functions).slice(0, 25);
  if (!entries.length) return { embeds: [embed], content: '⚠️ Configure pelo menos uma função de ticket antes de publicar o painel.' };
  if (entries.length === 1) {
    const [key, item] = entries[0];
    return { embeds: [embed], components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`AbrirTicket_${item.nome || key}`).setLabel(String(item.nome || key).slice(0, 80)).setStyle(ButtonStyle.Primary))] };
  }
  return { embeds: [embed], components: [new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId('abrirticket').setPlaceholder('Clique aqui para ver as opções').addOptions(entries.map(([key, item]) => ({ value: key, label: String(item.nome || key).slice(0, 100), description: String(item.descricao || item.predescricao || '').slice(0, 100), ...(item.emoji ? { emoji: item.emoji } : {}) }))))] };
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

async function buildTranscript(thread) {
  const messages = await thread.messages.fetch({ limit: 100 });
  const rows = [...messages.values()].reverse().map(message => {
    const content = escapeHtml(message.cleanContent || '[anexo, imagem ou componente]');
    const attachments = [...(message.attachments?.values?.() || [])].map(file => `<p><a href="${escapeHtml(file.url)}">📎 ${escapeHtml(file.name || 'Anexo')}</a></p>`).join('');
    return `<article><div class="meta">${escapeHtml(message.author?.tag || 'Usuário')} · ${new Date(message.createdTimestamp).toLocaleString('pt-BR')}</div><div class="content">${content.replace(/\n/g, '<br>')}${attachments}</div></article>`;
  }).join('\n');
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Transcript ${escapeHtml(thread.name)}</title><style>body{font-family:Arial,sans-serif;background:#f4f5f7;color:#202225;margin:0;padding:24px}.wrap{max-width:900px;margin:auto;background:#fff;border-radius:12px;padding:24px;box-shadow:0 2px 10px #0001}h1{margin-top:0;color:#5865f2}.meta{font-size:12px;color:#68727d;margin-bottom:6px}.content{white-space:normal;line-height:1.45}article{border-top:1px solid #e5e7eb;padding:14px 0}</style></head><body><main class="wrap"><h1>Transcript do ticket</h1><p><b>Thread:</b> ${escapeHtml(thread.name)}<br><b>ID:</b> ${escapeHtml(thread.id)}<br><b>Gerado em:</b> ${escapeHtml(new Date().toLocaleString('pt-BR'))}</p>${rows || '<p>Ticket sem mensagens.</p>'}</main></body></html>`;
  return { attachment: Buffer.from(html, 'utf8'), name: `transcript-${thread.id}.html` };
}

async function sendTranscript(interaction) {
  const attachment = await buildTranscript(interaction.channel);
  const c = config();
  const owner = await interaction.client.users.fetch(threadOwner(interaction.channel)).catch(() => null);
  const target = c.transcriptChannelId ? await interaction.client.channels.fetch(c.transcriptChannelId).catch(() => null) : null;
  const sent = { channel: false, user: false };
  if (target?.isTextBased?.()) {
    await target.send({ content: `📄 Transcript do ticket **${interaction.channel.name}** fechado por ${interaction.user}.`, files: [{ attachment: Buffer.from(attachment.attachment), name: attachment.name }] }).then(() => { sent.channel = true; }).catch(error => console.error('[LegacyTicketStaff] transcript channel send failed', error));
  }
  if (owner) {
    await owner.send({ content: `📄 Seu ticket foi encerrado. Segue o transcript do atendimento.`, files: [{ attachment: Buffer.from(attachment.attachment), name: attachment.name }] }).then(() => { sent.user = true; }).catch(error => console.error('[LegacyTicketStaff] transcript DM failed', error));
  }
  return { attachment, sent };
}

async function handle(interaction) {
  if (!interaction.guild || !isLegacyThread(interaction.channel)) return false;
  const id = interaction.customId || '';
  if (id.startsWith('ticket_') && !isStaff(interaction)) {
    if (!interaction.replied && !interaction.deferred) await interaction.reply({ content: '❌ Apenas a equipe autorizada pode usar esta ferramenta.', ephemeral: true });
    return true;
  }
  if (interaction.isButton?.()) {
    if (id === 'ticket_notify') {
      await interaction.channel.send(`🔔 <@${threadOwner(interaction.channel)}> — a equipe foi notificada por ${interaction.user}.`);
      return interaction.reply({ content: '✅ O solicitante foi notificado.', ephemeral: true });
    }
    if (id === 'ticket_claim') {
      const s = saveState(interaction.channel, { claimedBy: interaction.user.id, status: 'atendimento' });
      await interaction.channel.setName(`atendimento・${interaction.user.username}・${threadOwner(interaction.channel)}`).catch(() => {});
      return interaction.reply({ content: `✅ Ticket assumido por ${interaction.user}. Status: **${s.status}**.` });
    }
    if (id === 'ticket_transcript') {
      const result = await sendTranscript(interaction);
      return interaction.reply({ content: `✅ Transcript HTML gerado.${result.sent.channel ? ' Enviado ao canal configurado.' : ''}${result.sent.user ? ' Enviado ao solicitante por DM.' : ' Não foi possível enviar DM ao solicitante.'}`, ephemeral: true });
    }
    if (id === 'ticket_close') {
      await interaction.deferReply({ ephemeral: true });
      const result = await sendTranscript(interaction);
      saveState(interaction.channel, { status: 'resolvido' });
      await interaction.editReply({ content: `✅ Ticket fechado e transcript HTML gerado.${result.sent.channel ? ' Enviado ao canal configurado.' : ''}${result.sent.user ? ' Enviado ao solicitante por DM.' : ' Não foi possível enviar DM ao solicitante.'}` });
      return interaction.channel.setArchived(true, `Fechado por ${interaction.user.tag}`).catch(() => {});
    }
  }
  if (interaction.isStringSelectMenu?.()) {
    if (id === 'ticket_staff_options') {
      const value = interaction.values[0];
      if (value === 'status') return interaction.reply({ ...choiceMenu('ticket_status_select', 'Selecione o status', STATUSES), ephemeral: true });
      if (value === 'priority') return interaction.reply({ ...choiceMenu('ticket_priority_select', 'Selecione a prioridade', PRIORITIES), ephemeral: true });
      if (value === 'quick') return interaction.reply({ ...choiceMenu('ticket_quick_select', 'Escolha uma resposta pronta', Object.entries(config().quickReplies).map(([k, v]) => [k, k[0].toUpperCase() + k.slice(1), '⚡'])), ephemeral: true });
      if (value === 'purchases') return interaction.reply(purchasesMenu(interaction.channel));
      if (value === 'transfer') return interaction.showModal(transferModal());
      if (value === 'roles') return interaction.showModal(roleModal());
    }
    if (id === 'ticket_status_select') { const s = saveState(interaction.channel, { status: interaction.values[0] }); await interaction.channel.send(`📌 Status atualizado para **${interaction.values[0]}** por ${interaction.user}.`); return interaction.update({ content: '✅ Status atualizado.', components: [] }); }
    if (id === 'ticket_priority_select') { const s = saveState(interaction.channel, { priority: interaction.values[0] }); await interaction.channel.send(`🚦 Prioridade definida como **${interaction.values[0]}** por ${interaction.user}.`); return interaction.update({ content: '✅ Prioridade atualizada.', components: [] }); }
    if (id === 'ticket_quick_select') { const text = config().quickReplies[interaction.values[0]]; await interaction.channel.send(text); return interaction.update({ content: '✅ Resposta rápida enviada.', components: [] }); }
    if (id === 'ticket_purchase_link') { saveState(interaction.channel, { linkedPurchase: interaction.values[0] }); return interaction.update({ content: `✅ Compra **${interaction.values[0]}** vinculada ao ticket.`, components: [] }); }
  }
  if (interaction.isModalSubmit?.() && id === 'ticket_transfer_modal') {
    const userId = interaction.fields.getTextInputValue('ticket_transfer_user').replace(/\D/g, '');
    const roleId = interaction.fields.getTextInputValue('ticket_transfer_role').replace(/\D/g, '');
    if (userId) await interaction.channel.members.add(userId).catch(() => {});
    if (roleId) await interaction.channel.send(`🔁 Atendimento transferido para <@&${roleId}> por ${interaction.user}.`);
    if (userId) await interaction.channel.send(`👤 Novo atendente adicionado: <@${userId}>.`);
    saveState(interaction.channel, { transfer: userId || roleId });
    return interaction.reply({ content: '✅ Atendimento transferido com sucesso.', ephemeral: true });
  }
  if (interaction.isModalSubmit?.() && id === 'ticket_role_modal') {
    const roleId = interaction.fields.getTextInputValue('ticket_role_id').replace(/\D/g, '');
    const action = interaction.fields.getTextInputValue('ticket_role_action').trim().toLowerCase();
    const role = interaction.guild.roles.cache.get(roleId);
    if (!role) return interaction.reply({ content: '❌ Cargo não encontrado.', ephemeral: true });
    const c = config();
    const roles = new Set(c.staffRoleIds);
    if (action.startsWith('ad')) roles.add(role.id);
    else roles.delete(role.id);
    c.staffRoleIds = [...roles];
    tickets.set('tickets.staffConfig', c);
    await interaction.channel.send(`🛡️ Cargo ${role} ${action.startsWith('ad') ? 'autorizado' : 'removido da autorização'} por ${interaction.user}.`);
    return interaction.reply({ content: `✅ Controle de cargo executado: **${action}**.`, ephemeral: true });
  }
  return false;
}

function install(client) { client.on('interactionCreate', interaction => handle(interaction).catch(error => console.error('[LegacyTicketStaff]', error))); }
module.exports = { install, staffPanel, publicPanel, handle, isLegacyThread, config };
