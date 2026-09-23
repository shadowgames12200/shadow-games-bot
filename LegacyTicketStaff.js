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
const { owner: configuredOwnerId } = require('./config.json');
const { createTicketFromModal, CreateTicket, openForm } = require('./Functions/CreateTicket');

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
    configuracao.get('ConfigRoles.cargodono'),
    ...c.staffRoleIds
  ].filter(Boolean).map(String))];
}

function isStaff(interaction) {
  const userId = String(interaction.user?.id || '');
  const serverOwnerId = String(interaction.guild?.ownerId || configuredOwnerId || '');
  return Boolean(
    userId && userId === serverOwnerId ||
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
  const list = estatisticas.fetchAll().map(([key, data]) => ({ key, ...(data || {}) })).filter(item => String(item.userid) === owner).slice(0, 25);
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
  const entries = Object.entries(functions).slice(0, 5);
  if (!entries.length) return { embeds: [embed], content: '⚠️ Configure pelo menos uma função de ticket antes de publicar o painel.' };
  const buttons = entries.map(([key, item]) => {
    const button = new ButtonBuilder().setCustomId(`AbrirTicket_${key}`).setLabel(String(item.nome || key).slice(0, 80)).setStyle(ButtonStyle.Primary);
    if (item.emoji) button.setEmoji(item.emoji);
    return button;
  });
  return { embeds: [embed], components: [new ActionRowBuilder().addComponents(buttons)] };
}

function clientAddMemberModal() {
  return new ModalBuilder().setCustomId('ticket_client_add_member_modal').setTitle('Adicionar membro ao ticket').addComponents(
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('ticket_member_id').setLabel('ID ou menção do usuário').setPlaceholder('Ex.: 123456789012345678').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(25))
  );
}
function clientOptionText(value) {
  return {
    payment: '💳 O cliente selecionou **Informar pagamento**. Envie o comprovante ou os detalhes do pagamento neste ticket.',
    update: '📦 O cliente solicitou uma **atualização do pedido**. A equipe será avisada para verificar o status.',
    info: '📝 O cliente deseja **enviar outra informação**. Escreva os detalhes na próxima mensagem.',
  }[value] || '';
}
async function handleClientInteraction(interaction) {
  if (!interaction.channel?.isThread?.() || !isLegacyThread(interaction.channel)) return false;
  const id = interaction.customId || '';
  const owner = threadOwner(interaction.channel);
  if (interaction.isButton?.() && id === 'ticket_not_product') {
    if (String(interaction.user.id) !== String(owner)) return interaction.reply({ content: '❌ Apenas o cliente deste ticket pode usar esta opção.', ephemeral: true });
    await interaction.reply({ content: '✅ Informe na conversa o que você precisa. A equipe será avisada.', ephemeral: true });
    await interaction.channel.send(`🆘 <@${owner}> informou que o assunto **não é sobre um produto adquirido**.`);
    return true;
  }
  if ((interaction.isStringSelectMenu?.() || interaction.isSelectMenu?.()) && id === 'ticket_client_options') {
    if (String(interaction.user.id) !== String(owner)) return interaction.reply({ content: '❌ Apenas o cliente que abriu este ticket pode usar estas opções.', ephemeral: true }).then(() => true);
    const value = interaction.values[0];
    if (value === 'add_member') return interaction.showModal(clientAddMemberModal()).then(() => true);
    const text = clientOptionText(value);
    if (!text) return interaction.reply({ content: '❌ Opção indisponível.', ephemeral: true }).then(() => true);
    await interaction.reply({ content: '✅ Solicitação enviada à equipe.', ephemeral: true });
    await interaction.channel.send(`${text}\n👤 Solicitado por <@${interaction.user.id}>.`);
    return true;
  }
  if ((interaction.isStringSelectMenu?.() || interaction.isSelectMenu?.()) && id === 'ticket_client_purchase') {
    if (String(interaction.user.id) !== String(owner)) return interaction.reply({ content: '❌ Apenas o cliente que abriu este ticket pode vincular uma compra.', ephemeral: true }).then(() => true);
    const purchases = estatisticas.fetchAll().map(([key, data]) => ({ key, ...(data || {}) }));
    const item = purchases.find(p => String(p.key) === String(interaction.values[0]) && String(p.userid) === String(owner));
    if (!item) return interaction.reply({ content: '❌ Compra não encontrada para este ticket.', ephemeral: true }).then(() => true);
    saveState(interaction.channel, { linkedPurchase: item.key });
    await interaction.reply({ content: `✅ Compra vinculada a este ticket: **${String(item.campo || item.produto || 'Produto').slice(0, 100)}** • Quantidade: **${item.quantidade || 1}** • Valor: **R$ ${Number(item.valor || 0).toFixed(2)}**`, ephemeral: true });
    await interaction.channel.send(`🛒 O cliente <@${owner}> vinculou a compra **${String(item.produto || item.campo || 'Produto').slice(0, 100)}** ao atendimento. Pedido: **${item.idpagamento || item.key}**.`);
    return true;
  }
  if (interaction.isModalSubmit?.() && id === 'ticket_client_add_member_modal') {
    if (String(interaction.user.id) !== String(owner)) return interaction.reply({ content: '❌ Apenas o cliente que abriu o ticket pode solicitar alguém.', ephemeral: true }).then(() => true);
    const memberId = interaction.fields.getTextInputValue('ticket_member_id').replace(/[^0-9]/g, '');
    if (!/^\d{17,20}$/.test(memberId)) return interaction.reply({ content: '❌ ID de usuário inválido.', ephemeral: true }).then(() => true);
    if (memberId === String(owner)) return interaction.reply({ content: '❌ Esse usuário já é o dono do ticket.', ephemeral: true }).then(() => true);
    const requestId = `${Date.now()}_${memberId}`;
    tickets.set(`tickets.memberRequests.${interaction.channel.id}.${requestId}`, { memberId, requesterId: interaction.user.id, status: 'pending', createdAt: Date.now() });
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`ticket_member_accept_${requestId}`).setLabel('Aceitar').setEmoji('✅').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`ticket_member_reject_${requestId}`).setLabel('Recusar').setEmoji('❌').setStyle(ButtonStyle.Danger)
    );
    await interaction.reply({ content: '✅ Solicitação enviada para a equipe.', ephemeral: true });
    await interaction.channel.send({ content: `👤 **Solicitação para adicionar membro**\n<@${interaction.user.id}> solicitou adicionar <@${memberId}> ao ticket.\nA equipe deve escolher **Aceitar** ou **Recusar**.`, components: [row] });
    return true;
  }
  return false;
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

function storeProfile() {
  return {
    name: tickets.get('tickets.storeName') || configuracao.get('Config.NomeServidor') || 'Shadow Games',
    icon: tickets.get('tickets.storeIcon') || tickets.get('tickets.aparencia.logo') || configuracao.get('Config.Logo') || ''
  };
}

function ratingRow(threadId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`ticket_rating_1_${threadId}`).setLabel('Péssimo').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`ticket_rating_2_${threadId}`).setLabel('Ruim').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`ticket_rating_3_${threadId}`).setLabel('Médio').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`ticket_rating_4_${threadId}`).setLabel('Bom').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`ticket_rating_5_${threadId}`).setLabel('Excelente').setStyle(ButtonStyle.Success)
  );
}

function closedTicketCard(thread, closer, transcriptUrl) {
  const profile = storeProfile();
  const s = state(thread);
  const embed = new EmbedBuilder().setColor('#2ecc71').setTitle(`${profile.name} Ticket`).setDescription(
    `## Seu atendimento foi finalizado!\n\n` +
    `📄 **Considerações finais:**\nFinalizado\n\n` +
    `👤 **Staff:**\n${closer}\n\n` +
    `🆔 **ID:**\n${thread.id}\n\n` +
    `📌 **Motivo:**\n${s.reason || 'Suporte'}\n\n` +
    `Obrigado por usar o suporte!`
  ).setFooter({ text: profile.name });
  if (profile.icon && /^https?:\/\//i.test(profile.icon)) embed.setThumbnail(profile.icon);
  const components = [ratingRow(thread.id)];
  if (transcriptUrl) components.push(new ActionRowBuilder().addComponents(new ButtonBuilder().setLabel('Abrir Transcript').setEmoji('↗').setStyle(ButtonStyle.Link).setURL(transcriptUrl)));
  return { embeds: [embed], components };
}

async function handleRating(interaction) {
  const parts = interaction.customId.split('_');
  const rating = Number(parts[2]);
  const threadId = parts.slice(3).join('_');
  const key = `tickets.ratings.${threadId}`;
  tickets.set(key, { rating, userId: interaction.user.id, at: new Date().toISOString() });
  return interaction.reply({ content: `✅ Obrigado pela avaliação: **${['', 'Péssimo', 'Ruim', 'Médio', 'Bom', 'Excelente'][rating]}**.`, ephemeral: true });
}

async function buildTranscript(thread) {
  const messages = [...(await thread.messages.fetch({ limit: 100 })).values()].reverse();
  const profile = storeProfile();
  const guildName = thread.guild?.name || 'Servidor';
  const channelName = String(thread.name || 'ticket').replace(/^[^#]*/, '').trim() || String(thread.name || 'ticket');
  const ownerId = threadOwner(thread);
  const stateInfo = state(thread);
  const opener = ownerId ? `@${ownerId}` : 'Usuário';
  const openedAt = messages[0]?.createdTimestamp || Date.now();
  const date = new Date(openedAt).toLocaleString('pt-BR');
  const avatarFor = message => {
    try { return message.author?.displayAvatarURL?.({ extension: 'png', size: 64 }) || ''; } catch (_) { return ''; }
  };
  const messageRows = messages.map(message => {
    const avatar = avatarFor(message);
    const avatarHtml = avatar ? `<img class="avatar" src="${escapeHtml(avatar)}" alt="">` : '<div class="avatar avatar-fallback">●</div>';
    const content = escapeHtml(message.cleanContent || '[anexo, imagem ou componente]').replace(/\n/g, '<br>');
    const attachments = [...(message.attachments?.values?.() || [])].map(file => `<div class="attachment"><a href="${escapeHtml(file.url)}" target="_blank" rel="noreferrer">📎 ${escapeHtml(file.name || 'Anexo')}</a></div>`).join('');
    return `<div class="message"><div class="avatar-wrap">${avatarHtml}</div><div class="message-body"><div class="author">${escapeHtml(message.author?.tag || 'Usuário')}<span class="timestamp">${new Date(message.createdTimestamp).toLocaleString('pt-BR')}</span></div><div class="content">${content}${attachments}</div></div></div>`;
  }).join('\n');
  const controls = ['Fechar Ticket', 'Assumir Ticket', 'Assumir Admin', 'Renomear Canal', 'Adicionar Membro', 'Remover Membro'].map(label => `<span class="control">${label}</span>`).join('');
  const logo = profile.icon && /^https?:\/\//i.test(profile.icon) ? `<img class="logo" src="${escapeHtml(profile.icon)}" alt="">` : '';
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(channelName)}</title><style>
:root{--bg:#f4f5f7;--card:#fff;--ink:#23272a;--muted:#747f8d;--line:#e4e7eb;--accent:#5865f2;--green:#43b581}*{box-sizing:border-box}body{margin:0;background:var(--bg);font-family:Arial,Helvetica,sans-serif;color:var(--ink)}.page{max-width:1040px;margin:0 auto;padding:28px 22px 48px}.brand{font-size:26px;font-weight:800;letter-spacing:.5px;margin:4px 0 22px;display:flex;align-items:center;gap:10px}.logo{width:34px;height:34px;border-radius:50%;object-fit:cover}.channel-title{font-size:24px;font-weight:700;margin:0 0 8px}.start{color:var(--muted);font-size:14px;margin-bottom:18px}.summary{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:18px 20px;box-shadow:0 1px 3px #0000000a}.summary-head{font-size:14px;margin-bottom:12px}.summary-head b{color:var(--accent)}.fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px 26px;font-size:14px}.field-label{color:var(--muted);font-size:12px;text-transform:uppercase;letter-spacing:.4px}.field-value{font-weight:600;margin-top:3px}.controls{display:flex;gap:7px;flex-wrap:wrap;margin:16px 0 22px}.control{background:#e9eaed;color:#4f5660;border-radius:4px;padding:7px 10px;font-size:12px;font-weight:600}.messages{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:6px 20px}.message{display:flex;gap:12px;padding:14px 0;border-bottom:1px solid #f0f1f3}.message:last-child{border-bottom:0}.avatar-wrap{flex:0 0 40px}.avatar{width:40px;height:40px;border-radius:50%;object-fit:cover;background:#5865f2}.avatar-fallback{display:flex;align-items:center;justify-content:center;color:white;font-size:18px}.author{font-weight:700;font-size:14px}.timestamp{font-size:12px;color:var(--muted);font-weight:400;margin-left:9px}.content{font-size:14px;line-height:1.55;margin-top:5px;white-space:normal}.attachment{margin-top:8px}.attachment a{color:var(--accent);text-decoration:none}.footer{display:flex;justify-content:space-between;align-items:center;margin-top:22px;color:var(--muted);font-size:13px}.finished{color:var(--green);font-weight:700}@media(max-width:650px){.page{padding:18px 12px}.fields{grid-template-columns:1fr}.messages{padding:4px 12px}.timestamp{display:block;margin:4px 0 0}}
</style></head><body><main class="page"><div class="brand">${logo}${escapeHtml(guildName)}</div><h1 class="channel-title">#🛠️┋${escapeHtml(channelName)}</h1><div class="start">This is the start of #🛠️┋${escapeHtml(channelName)} channel.</div><section class="summary"><div class="summary-head">TicketBot <span class="muted">${escapeHtml(date)}</span></div><div class="fields"><div><div class="field-label">Aberto por</div><div class="field-value">${escapeHtml(opener)}</div></div><div><div class="field-label">Motivo</div><div class="field-value">${escapeHtml(stateInfo.reason || 'Suporte')}</div></div><div><div class="field-label">Status</div><div class="field-value">${escapeHtml(stateInfo.status || 'Aberto')}</div></div><div><div class="field-label">ID do Ticket</div><div class="field-value">${escapeHtml(thread.id)}</div></div></div></section><div class="controls">${controls}</div><section class="messages">${messageRows || '<div class="message">Ticket sem mensagens.</div>'}</section><div class="footer"><span class="finished">Finalizado</span><span>Exported ${messages.length} messages.</span></div></main></body></html>`;
  return { attachment: Buffer.from(html, 'utf8'), name: `transcript-${thread.id}.html` };
}
async function sendTranscript(interaction, finalized = false) {
  const attachment = await buildTranscript(interaction.channel);
  const c = config();
  const owner = await interaction.client.users.fetch(threadOwner(interaction.channel)).catch(() => null);
  const target = c.transcriptChannelId ? await interaction.client.channels.fetch(c.transcriptChannelId).catch(() => null) : null;
  const sent = { channel: false, user: false };
  let transcriptUrl = '';
  if (target?.isTextBased?.()) {
    await target.send({ content: `📄 Transcript do ticket **${interaction.channel.name}** fechado por ${interaction.user}.`, files: [{ attachment: Buffer.from(attachment.attachment), name: attachment.name }] }).then(message => { sent.channel = true; transcriptUrl = message.attachments.first()?.url || ''; }).catch(error => console.error('[LegacyTicketStaff] transcript channel send failed', error));
  }
  const card = closedTicketCard(interaction.channel, interaction.user, transcriptUrl);
  if (finalized && target?.isTextBased?.()) await target.send(card).catch(error => console.error('[LegacyTicketStaff] closing card channel send failed', error));
  if (owner) {
    // O usuário recebe somente o cartão; o botão abre o HTML hospedado no canal de transcripts.
    const payload = finalized
      ? { ...card, content: transcriptUrl ? '📄 Seu ticket foi encerrado. Clique em **Abrir Transcript** para visualizar o atendimento no navegador.' : '📄 Seu ticket foi encerrado. O transcript não pôde receber um link porque o canal de transcripts não está configurado.' }
      : { content: '📄 O transcript será disponibilizado no cartão final quando o ticket for encerrado.' };
    await owner.send(payload).then(() => { sent.user = true; }).catch(error => console.error('[LegacyTicketStaff] transcript DM failed', error));
  }
  return { attachment, sent, transcriptUrl };
}

async function handle(interaction) {
  if (interaction.isButton?.() && String(interaction.customId || '').startsWith('AbrirTicket_')) return await interaction.showModal(openForm(String(interaction.customId).replace('AbrirTicket_', '')));
  if ((interaction.isStringSelectMenu?.() || interaction.isSelectMenu?.()) && (interaction.customId === 'ticket_public_options' || interaction.customId === 'abrirticket')) return await interaction.showModal(openForm(interaction.values[0]));
  if (interaction.isModalSubmit?.() && interaction.customId?.startsWith('ticket_open_form_')) return await createTicketFromModal(interaction);
  if (interaction.isButton?.() && interaction.customId?.startsWith('ticket_rating_')) return handleRating(interaction);
  if (interaction.isButton?.() || interaction.isStringSelectMenu?.() || interaction.isModalSubmit?.()) {
    if (await handleClientInteraction(interaction)) return true;
  }
  if (!interaction.guild || !isLegacyThread(interaction.channel)) return false;
  const id = interaction.customId || '';
  if (id.startsWith('ticket_') && !isStaff(interaction)) {
    if (!interaction.replied && !interaction.deferred) await interaction.reply({ content: '❌ Apenas a equipe autorizada pode usar esta ferramenta.', ephemeral: true });
    return true;
  }
  if (interaction.isButton?.() && (id.startsWith('ticket_member_accept_') || id.startsWith('ticket_member_reject_'))) {
    if (!isStaff(interaction)) return interaction.reply({ content: '❌ Apenas a equipe autorizada ou o dono do servidor pode decidir esta solicitação.', ephemeral: true });
    const accepted = id.startsWith('ticket_member_accept_');
    const requestId = id.replace(/^ticket_member_(?:accept|reject)_/, '');
    const request = tickets.get(`tickets.memberRequests.${interaction.channel.id}.${requestId}`);
    if (!request || request.status !== 'pending') return interaction.reply({ content: '⚠️ Esta solicitação já foi resolvida ou expirou.', ephemeral: true });
    if (!accepted) {
      tickets.set(`tickets.memberRequests.${interaction.channel.id}.${requestId}`, { ...request, status: 'rejected', decidedBy: interaction.user.id, decidedAt: Date.now() });
      await interaction.update({ content: `❌ Solicitação recusada por ${interaction.user}.\nUsuário solicitado: <@${request.memberId}>.`, components: [] });
      return true;
    }
    await interaction.deferUpdate();
    try {
      await interaction.channel.members.add(request.memberId);
      tickets.set(`tickets.memberRequests.${interaction.channel.id}.${requestId}`, { ...request, status: 'accepted', decidedBy: interaction.user.id, decidedAt: Date.now() });
      await interaction.editReply({ content: `✅ Solicitação aceita por ${interaction.user}.\n<@${request.memberId}> foi adicionado ao ticket.`, components: [] });
      await interaction.channel.send(`👤 <@${request.memberId}> foi adicionado ao ticket após aprovação de ${interaction.user}.`);
    } catch (_) {
      await interaction.editReply({ content: '❌ Não foi possível adicionar esse usuário. Verifique o ID e as permissões do bot.', components: [] });
    }
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
      const result = await sendTranscript(interaction, false);
      return interaction.reply({ content: `✅ Transcript HTML gerado.${result.sent.channel ? ' Enviado ao canal configurado.' : ''}${result.sent.user ? ' Enviado ao solicitante por DM.' : ' Não foi possível enviar DM ao solicitante.'}`, ephemeral: true });
    }
    if (id === 'ticket_close') {
      await interaction.deferReply({ ephemeral: true });
      const result = await sendTranscript(interaction, true);
      saveState(interaction.channel, { status: 'resolvido' });
      await interaction.editReply({ content: `✅ Ticket fechado e transcript HTML gerado.${result.sent.channel ? ' Enviado ao canal configurado.' : ''}${result.sent.user ? ' Enviado ao solicitante por DM.' : ' Não foi possível enviar DM ao solicitante.'}` });
      return setTimeout(() => interaction.channel.delete(`Fechado e salvo por ${interaction.user.tag}`).catch(() => {}), 1000);
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
