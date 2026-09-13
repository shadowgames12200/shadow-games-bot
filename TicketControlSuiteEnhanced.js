const {
  Events, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle,
  EmbedBuilder, PermissionFlagsBits, ChannelType, AttachmentBuilder, ModalBuilder, TextInputBuilder, TextInputStyle
} = require('discord.js');
const { db, save } = require('./ProfessionalSuite');

const DEFAULT_TEAMS = {
  suporte: { name: 'Suporte ao Cliente', description: 'Ajuda com produtos, pedidos e atendimento ao cliente.', emoji: '🎧', roleId: '', categoryId: '' },
  duvidas: { name: 'Dúvidas', description: 'Tire dúvidas sobre produtos, serviços e funcionamento da loja.', emoji: '❓', roleId: '', categoryId: '' },
  parceria: { name: 'Parcerias', description: 'Envie uma proposta de parceria para a Shadow Games.', emoji: '🤝', roleId: '', categoryId: '' },
  financeiro: { name: 'Financeiro', description: 'Ajuda com pagamentos, comprovantes e cobranças.', emoji: '💳', roleId: '', categoryId: '' }
};
const PURPLE = '#7c3aed';
const slaTimers = new Map();
const QUICK_REPLIES = { pagamento: 'Olá! Vou verificar o pagamento e retorno com uma atualização em breve.', entrega: 'Olá! Vou consultar o status da entrega do seu pedido.', prazo: 'O prazo depende do produto e da confirmação do pagamento. Vou verificar para você.', troca: 'Vou analisar as condições da troca e já retorno com os próximos passos.', garantia: 'Vou conferir as informações da garantia do seu produto.' };

function ensure() {
  db.ticketConfig ||= {};
  db.ticketStats ||= { opened: 0, closed: 0, ratings: [] };
  Object.assign(db.ticketConfig, {
    panelTitle: 'Central de Atendimento | Shadow Games',
    panelDescription: 'Ao abrir um ticket, um integrante da equipe irá lhe responder. Nosso atendimento é privado, rápido e eficiente, disponível 24 horas por dia, sujeito à disponibilidade em horários de pico.',
    panelColor: PURPLE, panelImage: '', logsChannelId: '', claimRole: '', closeRole: '', ...db.ticketConfig
  });
  db.ticketConfig.permissions ||= {};
  db.ticketConfig.assumeRoleIds ||= [];
  if (!Array.isArray(db.ticketConfig.assumeRoleIds)) db.ticketConfig.assumeRoleIds = String(db.ticketConfig.assumeRoleIds || '').split(',').map(x => x.trim()).filter(Boolean);
  db.ticketConfig.teams = { ...DEFAULT_TEAMS, ...(db.ticketConfig.teams || {}) };
  for (const [key, team] of Object.entries(db.ticketConfig.teams)) db.ticketConfig.teams[key] = { ...DEFAULT_TEAMS[key], ...team };
  save();
}

const slug = value => String(value || 'usuario').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').slice(0, 24).replace(/^-|-$/g, '') || 'usuario';
const topicInfo = channel => { const p = String(channel?.topic || '').split(':'); return p[0] === 'ticket' ? { userId: p[1], team: p[2], claimedBy: p[3] || '', status: p[4] || 'aberto', priority: p[5] || 'normal' } : {}; };
const topicFor = info => `ticket:${info.userId}:${info.team}:${info.claimedBy || ''}:${info.status || 'aberto'}:${info.priority || 'normal'}`;
const roleIdsFor = team => [...new Set([team.roleId, ...(team.roleIds || []), ...(db.ticketConfig.assumeRoleIds || [])].filter(Boolean))];
const configuredTicket = guildId => db.botConfig?.[guildId]?.ticket || {};
const transcriptChannelId = guildId => configuredTicket(guildId).transcriptChannelId || db.ticketConfig.logsChannelId || '';
function jumpButton(guild, channel) { return new ButtonBuilder().setLabel('Ir para ticket').setEmoji('🎫').setStyle(ButtonStyle.Link).setURL(`https://discord.com/channels/${guild.id}/${channel.id}`); }
const isStaff = (interaction, team = {}) => Boolean(interaction.memberPermissions?.has(PermissionFlagsBits.Administrator) || interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels) || [...roleIdsFor(team), db.ticketConfig.claimRole, db.ticketConfig.closeRole, db.ticketConfig.permissions?.claimRole, db.ticketConfig.permissions?.closeRole].filter(Boolean).some(id => interaction.member?.roles?.cache?.has(id)));
const teamFor = key => db.ticketConfig.teams[key] || db.ticketConfig.teams.suporte;

function categoryMenu() {
  return new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId('ticket_category').setPlaceholder('Clique aqui para ver as opções').addOptions(Object.entries(db.ticketConfig.teams).slice(0, 25).map(([value, team]) => ({ label: team.name.slice(0, 100), description: String(team.description || '').slice(0, 100), value, emoji: team.emoji || '🎫' }))));
}
function panel() {
  const c = db.ticketConfig;
  const embed = new EmbedBuilder().setColor(c.panelColor || PURPLE).setTitle(c.panelTitle).setDescription(c.panelDescription);
  if (c.panelImage) embed.setImage(c.panelImage);
  return { embeds: [embed], components: [categoryMenu()] };
}
function ticketButtons(guildId) {
  const configured = configuredTicket(guildId).internal?.buttons || ['notify','claim','transcript','close'];
  const defs = {
    notify: () => new ButtonBuilder().setCustomId('ticket_notify').setLabel('Notificar equipe').setEmoji('🔔').setStyle(ButtonStyle.Secondary),
    claim: () => new ButtonBuilder().setCustomId('ticket_claim').setLabel('Assumir Ticket').setEmoji('🔒').setStyle(ButtonStyle.Primary),
    transcript: () => new ButtonBuilder().setCustomId('ticket_transcript').setLabel('Salvar transcript').setEmoji('📄').setStyle(ButtonStyle.Secondary),
    close: () => new ButtonBuilder().setCustomId('ticket_close').setLabel('Fechar e Salvar').setEmoji('🔒').setStyle(ButtonStyle.Danger)
  };
  const buttons = configured.filter(key => defs[key]).map(key => defs[key]());
  return buttons.length ? new ActionRowBuilder().addComponents(...buttons) : null;
}
function clientOptionMenu() {
  return new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId('ticket_client_options').setPlaceholder('Opções do cliente').addOptions(
    { label: 'Opções Clientes', description: 'Opções disponíveis para você', value: 'client', emoji: '👤' },
    { label: 'Informar pedido', description: 'Vincular uma compra a este ticket', value: 'purchase', emoji: '📦' }
  ));
}
function staffPanel(interaction) {
  const info = topicInfo(interaction.channel);
  if (!info.userId) return interaction.reply({ content: '❌ Use este comando dentro de um canal de ticket.', ephemeral: true });
  const team = teamFor(info.team);
  if (!isStaff(interaction, team)) return interaction.reply({ content: '❌ Apenas a equipe pode abrir as ferramentas do ticket.', ephemeral: true });
  const controls = ticketButtons(interaction.guild.id);
  const components = [new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId('ticket_staff_options').setPlaceholder('Mais ferramentas').addOptions(
    { label: 'Transferir atendimento', description: 'Mover para outro setor ou atendente', value: 'transfer', emoji: '🔁' },
    { label: 'Alterar status', description: 'Atualizar o andamento do atendimento', value: 'status', emoji: '📌' },
    { label: 'Definir prioridade', description: 'Marcar urgência do ticket', value: 'priority', emoji: '🚦' },
    { label: 'Respostas rápidas', description: 'Enviar uma mensagem pronta', value: 'quick', emoji: '⚡' }
  ))];
  if (controls) components.unshift(controls);
  return interaction.reply({ content: '🛠️ Ferramentas da equipe', components, ephemeral: true });
}

function purchases(interaction) {
  const uid = String(interaction.user.id);
  const stores = [db.purchases, db.purchaseHistory, db.orders, db.sales, Object.values(db.payment?.charges || {})].filter(Boolean);
  const matches = [];
  const seen = new Set();
  const scan = value => {
    if (!value || typeof value !== 'object' || seen.has(value)) return;
    seen.add(value);
    if (Array.isArray(value)) return value.forEach(scan);
    const owner = String(value.userId || value.user || value.discordId || value.discordID || value.customerId || value.ownerId || value.discord_user_id || '');
    if (owner === uid && (value.product || value.productName || value.name || value.item || value.ref || value.externalReference || value.external_reference)) matches.push(value);
    Object.values(value).forEach(scan);
  };
  stores.forEach(scan);
  return matches.slice(-25);
}
function purchasePanel(interaction) {
  const settings = configuredTicket(interaction.guild.id).purchases || {};
  if (settings.enabled === false) return null;
  const list = purchases(interaction);
  const options = list.map((p, index) => ({ label: `ID: ${p.id || p.orderId || p.ref || index + 1} - ${String(p.product || p.productName || p.name || p.item || p.externalReference || 'Produto').slice(0, 75)}`, value: String(p.id || p.orderId || p.ref || index + 1) }));
  return { embeds: [new EmbedBuilder().setColor(PURPLE).setTitle(settings.title || 'Compras encontradas').setDescription(settings.description || 'Caso o ticket seja referente a um pedido já efetuado, selecione a compra abaixo.')], components: [new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId('ticket_purchase').setPlaceholder('Selecione uma das últimas compras').addOptions(options.length ? options : [{ label: 'Nenhuma compra encontrada', value: 'none', emoji: '📦' }]))] };
}
async function createTicket(interaction, key, form = null) {
  const team = teamFor(key), guild = interaction.guild;
  db.ticketAntiSpam ||= {};
  const now = Date.now(), previous = Number(db.ticketAntiSpam[interaction.user.id] || 0);
  if (now - previous < 20000) return interaction.reply({ content: '⏳ Aguarde alguns segundos antes de abrir outro ticket.', ephemeral: true });
  db.ticketAntiSpam[interaction.user.id] = now;
  db.ticketStats ||= { opened: 0, closed: 0, ratings: [] };
  const existing = guild.channels.cache.find(channel => topicInfo(channel).userId === interaction.user.id && topicInfo(channel).team === key);
  if (existing) return interaction.reply({ content: `Você já possui um ticket aberto nesta categoria: ${existing}`, ephemeral: true });
  const permissions = [
    { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
    { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles] },
    { id: guild.members.me.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageMessages] }
  ];
  for (const roleId of roleIdsFor(team)) permissions.push({ id: roleId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] });
  const channel = await guild.channels.create({ name: `${slug(team.name)}-${slug(interaction.user.username)}-${String(interaction.user.id).slice(-4)}`, type: ChannelType.GuildText, parent: team.categoryId || undefined, topic: topicFor({ userId: interaction.user.id, team: key, status: 'aberto', priority: 'normal' }), permissionOverwrites: permissions });
  const formText = form ? `\n\n**Nome:** ${form.name}\n**Pedido/compra:** ${form.order}\n**Descrição:** ${form.problem}` : '';
  const embed = new EmbedBuilder().setColor(PURPLE).setTitle(`🎫 ${team.name}`).setDescription(`Olá ${interaction.user}, seu ticket foi criado!\n\nNossa equipe irá atendê-lo em breve.\n\n**Categoria:** ${team.name}\n**Solicitante:** ${interaction.user.tag}${formText}`);
  const teamMentions = roleIdsFor(team).map(roleId => `<@&${roleId}>`).join(' ');
  await channel.send({ content: `${interaction.user}${teamMentions ? ` ${teamMentions}` : ''}`, embeds: [embed], components: [clientOptionMenu()] });
  const purchaseMessage = purchasePanel(interaction);
  if (purchaseMessage) await channel.send(purchaseMessage);
  db.ticketStats.opened = (db.ticketStats.opened || 0) + 1; save();
  scheduleSla(channel);
  return interaction.reply({ content: `✅ Seu ticket foi criado: ${channel}`, components: [new ActionRowBuilder().addComponents(jumpButton(guild, channel))], ephemeral: true });
}
function scheduleSla(channel) {
  if (slaTimers.has(channel.id)) clearTimeout(slaTimers.get(channel.id));
  const timer = setTimeout(async () => {
    const info = topicInfo(channel);
    if (!info.userId || info.status !== 'aberto') return;
    const team = teamFor(info.team);
    await channel.send({ content: `⏰ SLA: este ticket está aguardando atendimento há 15 minutos.${team.roleId ? ` <@&${team.roleId}>` : ''}` }).catch(() => {});
  }, 15 * 60 * 1000);
  slaTimers.set(channel.id, timer);
}
function operationMenu(kind) {
  const options = kind === 'status' ? [
    ['aberto','Aberto','O ticket aguarda atendimento','🟢'], ['atendimento','Em atendimento','Um atendente está trabalhando','🔵'], ['aguardando','Aguardando cliente','A equipe aguarda resposta','🟡'], ['resolvido','Resolvido','Problema solucionado','✅']
  ] : [
    ['baixa','Baixa','Sem urgência','🟢'], ['normal','Normal','Prioridade padrão','🔵'], ['alta','Alta','Atendimento prioritário','🟠'], ['urgente','Urgente','Atendimento imediato','🔴']
  ];
  return { components: [new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId(`ticket_${kind}`).setPlaceholder(kind === 'status' ? 'Selecione o status' : 'Selecione a prioridade').addOptions(options.map(([value,label,description,emoji]) => ({ value,label,description,emoji }))))] };
}
function quickReplyMenu() {
  return { components: [new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId('ticket_quick').setPlaceholder('Escolha uma resposta pronta').addOptions(Object.keys(QUICK_REPLIES).map(value => ({ value, label: value[0].toUpperCase()+value.slice(1), description: QUICK_REPLIES[value].slice(0,100), emoji:'⚡' }))))] };
}
function openTicketModal(key) {
  const fields = [new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('ticket_open_name').setLabel('Seu nome ou apelido').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(80))];
  if (key === 'suporte') fields.push(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('ticket_open_order').setLabel('ID ou nome do produto (opcional)').setStyle(TextInputStyle.Short).setRequired(false).setMaxLength(100)));
  fields.push(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('ticket_open_problem').setLabel(key === 'duvidas' ? 'Qual é a sua dúvida?' : 'Explique como podemos ajudar').setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(1000)));
  return new ModalBuilder().setCustomId(`ticket_open_${key}`).setTitle(`Abrir ${teamFor(key).name}`).addComponents(fields);
}

function transferModal() {
  return new ModalBuilder().setCustomId('ticket_transfer').setTitle('Transferir atendimento').addComponents(
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('ticket_transfer_team').setLabel('Setor: suporte, duvidas, financeiro ou parceria').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(30)),
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('ticket_transfer_user').setLabel('ID do atendente (opcional)').setStyle(TextInputStyle.Short).setRequired(false).setMaxLength(25))
  );
}
async function handleTransfer(interaction) {
  const info = topicInfo(interaction.channel), current = teamFor(info.team);
  if (!isStaff(interaction, current)) return interaction.reply({ content: '❌ Apenas a equipe pode transferir este ticket.', ephemeral: true });
  const key = interaction.fields.getTextInputValue('ticket_transfer_team').trim().toLowerCase();
  const target = db.ticketConfig.teams[key];
  if (!target) return interaction.reply({ content: '❌ Setor inválido. Use suporte, duvidas, financeiro ou parceria.', ephemeral: true });
  const attendant = interaction.fields.getTextInputValue('ticket_transfer_user').replace(/[^0-9]/g, '');
  if (info.team && info.team !== key && current.roleId) await interaction.channel.permissionOverwrites.edit(current.roleId, { ViewChannel: false, SendMessages: false }).catch(() => {});
  await interaction.channel.setTopic(topicFor({ ...info, team: key, claimedBy: attendant || info.claimedBy || '', status: info.status, priority: info.priority }));
  if (target.roleId) await interaction.channel.permissionOverwrites.edit(target.roleId, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true }).catch(() => {});
  if (attendant) await interaction.channel.permissionOverwrites.edit(attendant, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true }).catch(() => {});
  await interaction.channel.send(`🔁 Atendimento transferido para **${target.name}**${attendant ? ` e atribuído a <@${attendant}>` : ''} por ${interaction.user}.`);
  return interaction.reply({ content: '✅ Ticket transferido com sucesso.', ephemeral: true });
}
async function handleTicketStatus(interaction) {
  const info=topicInfo(interaction.channel), team=teamFor(info.team);
  if (!isStaff(interaction, team)) return interaction.reply({content:'❌ Apenas a equipe pode alterar o status.',ephemeral:true});
  const status=interaction.values[0];
  await interaction.channel.setTopic(topicFor({...info,status}));
  if (status !== 'aberto' && slaTimers.has(interaction.channel.id)) { clearTimeout(slaTimers.get(interaction.channel.id)); slaTimers.delete(interaction.channel.id); }
  await interaction.channel.send(`📌 Status atualizado para **${status}** por ${interaction.user}.`);
  return interaction.reply({content:'✅ Status atualizado.',ephemeral:true});
}
async function handleTicketPriority(interaction) {
  const info=topicInfo(interaction.channel), team=teamFor(info.team);
  if (!isStaff(interaction, team)) return interaction.reply({content:'❌ Apenas a equipe pode alterar a prioridade.',ephemeral:true});
  const priority=interaction.values[0];
  await interaction.channel.setTopic(topicFor({...info,priority}));
  await interaction.channel.send(`${priority === 'urgente' ? '🚨' : '🚦'} Prioridade definida como **${priority}** por ${interaction.user}.`);
  return interaction.reply({content:'✅ Prioridade atualizada.',ephemeral:true});
}
async function handleQuickReply(interaction) {
  const info=topicInfo(interaction.channel), team=teamFor(info.team);
  if (!isStaff(interaction, team)) return interaction.reply({content:'❌ Apenas a equipe pode usar respostas rápidas.',ephemeral:true});
  await interaction.channel.send(QUICK_REPLIES[interaction.values[0]] || '');
  return interaction.reply({content:'✅ Resposta rápida enviada.',ephemeral:true});
}
async function handleOpenModal(interaction) {
  const key = interaction.customId.replace('ticket_open_', '');
  const form = { name: interaction.fields.getTextInputValue('ticket_open_name'), order: interaction.fields.fields.has('ticket_open_order') ? interaction.fields.getTextInputValue('ticket_open_order') : 'Não se aplica', problem: interaction.fields.getTextInputValue('ticket_open_problem') };
  return createTicket(interaction, key, form);
}

async function notifyTeam(interaction) {
  const info = topicInfo(interaction.channel), team = teamFor(info.team);
  if (!isStaff(interaction, team)) return interaction.reply({ content: '❌ Apenas a equipe pode notificar o atendimento.', ephemeral: true });
  await interaction.channel.send({ content: `🔔 <@${info.userId}> — a equipe foi notificada por ${interaction.user}.` });
  return interaction.reply({ content: '✅ O solicitante foi notificado.', ephemeral: true });
}
async function claimTicket(interaction) {
  const info = topicInfo(interaction.channel), team = teamFor(info.team);
  if (!isStaff(interaction, team)) return interaction.reply({ content: '❌ Você não pode assumir este ticket.', ephemeral: true });
  if (info.claimedBy && info.claimedBy !== interaction.user.id) return interaction.reply({ content: `❌ Este ticket já foi assumido por <@${info.claimedBy}>.`, ephemeral: true });
  await interaction.channel.setTopic(topicFor({ ...info, claimedBy: interaction.user.id }));
  for (const roleId of roleIdsFor(team)) await interaction.channel.permissionOverwrites.edit(roleId, { ViewChannel: false, SendMessages: false }).catch(() => {});
  await interaction.channel.permissionOverwrites.edit(interaction.user.id, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true }).catch(() => {});
  return interaction.reply({ content: `🔒 Ticket assumido por ${interaction.user}. Os demais atendentes não poderão assumir este ticket.` });
}
const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
async function transcriptMessages(channel) {
  const messages = [];
  let before;
  while (true) {
    const batch = await channel.messages.fetch({ limit: 100, ...(before ? { before } : {}) });
    if (!batch.size) break;
    messages.push(...batch.values());
    before = batch.last().id;
    if (batch.size < 100) break;
  }
  return messages.reverse();
}
function transcriptHtml(channel, messages) {
  const info = topicInfo(channel);
  const opener = messages.find(message => message.author.id === info.userId)?.author;
  const rows = messages.map(message => {
    const avatar = message.author.displayAvatarURL?.({ extension: 'png', size: 64 }) || '';
    const fromClient = message.author.id === info.userId;
    const role = fromClient ? 'Cliente' : 'Equipe';
    const attachments = [...message.attachments.values()].map(file => {
      const image = String(file.contentType || '').startsWith('image/') ? `<img class="image" src="${escapeHtml(file.url)}" alt="${escapeHtml(file.name || 'Imagem')}">` : '';
      return `<a class="attachment" href="${escapeHtml(file.url)}" target="_blank" rel="noopener">${image}<span>📎 ${escapeHtml(file.name || 'Anexo')}</span></a>`;
    }).join('');
    const embeds = message.embeds.map(embed => `<div class="embed"><strong>${escapeHtml(embed.title || 'Embed')}</strong>${embed.description ? `<p>${escapeHtml(embed.description)}</p>` : ''}${embed.url ? `<a href="${escapeHtml(embed.url)}" target="_blank" rel="noopener">Abrir link</a>` : ''}</div>`).join('');
    return `<article class="message ${fromClient ? 'client' : 'staff'}"><img class="avatar" src="${escapeHtml(avatar)}" alt=""><div class="body"><div class="meta"><strong>${escapeHtml(message.author.globalName || message.author.username || message.author.tag)}</strong><span class="badge">${role}</span><span>${escapeHtml(message.createdAt.toLocaleString('pt-BR'))}</span></div><div class="content">${escapeHtml(message.content || '') || '<em>sem texto</em>'}</div>${embeds}${attachments}</div></article>`;
  }).join('\n');
  const openedAt = channel.createdAt?.toLocaleString('pt-BR') || messages[0]?.createdAt?.toLocaleString('pt-BR') || new Date().toLocaleString('pt-BR');
  const author = opener ? `${opener.globalName || opener.username || opener.tag} (<@${opener.id}>)` : `<@${info.userId || 'desconhecido'}>`;
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Transcript - ${escapeHtml(channel.name)}</title><style>body{margin:0;background:#313338;color:#dbdee1;font:15px Arial,sans-serif}.wrap{max-width:960px;margin:0 auto;background:#2b2d31;min-height:100vh}.header{padding:28px 32px;background:#1e1f22;border-bottom:4px solid #7c3aed}.header h1{margin:0 0 8px;color:#fff}.header p{margin:4px 0;color:#b5bac1}.legend{margin-top:16px;display:flex;gap:10px}.legend span,.badge{padding:3px 7px;border-radius:10px;font-size:11px}.legend .client,.client .badge{background:#2563eb;color:#fff}.legend .staff,.staff .badge{background:#16a34a;color:#fff}.message{display:flex;gap:14px;padding:16px 32px;border-bottom:1px solid #3f4147}.message.client{background:rgba(37,99,235,.06)}.message.staff{background:rgba(22,163,74,.04)}.avatar{width:40px;height:40px;border-radius:50%;background:#5865f2}.body{flex:1;min-width:0}.meta{display:flex;gap:10px;align-items:baseline;flex-wrap:wrap}.meta strong{color:#fff}.meta span:not(.badge){color:#949ba4;font-size:12px}.content{margin-top:5px;white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.45}.attachment{display:inline-flex;flex-direction:column;vertical-align:top;margin:10px 8px 0 0;padding:8px 10px;background:#1e1f22;border-radius:4px;color:#00aff4;text-decoration:none}.image{max-width:360px;max-height:240px;border-radius:4px;margin-bottom:6px}.embed{margin-top:10px;padding:10px 14px;border-left:4px solid #5865f2;background:#1e1f22;border-radius:4px}.embed p{white-space:pre-wrap}.footer{padding:24px 32px;color:#949ba4;text-align:center}</style></head><body><main class="wrap"><header class="header"><h1>Transcript — #${escapeHtml(channel.name)}</h1><p>Autor do ticket: ${escapeHtml(author)}</p><p>Aberto em: ${escapeHtml(openedAt)} • ${messages.length} mensagens</p><div class="legend"><span class="client">Cliente</span><span class="staff">Equipe</span></div></header>${rows || '<p style="padding:32px">Nenhuma mensagem.</p>'}<footer class="footer">Transcript gerado automaticamente pelo Atendente Shadow</footer></main></body></html>`;
}
async function saveTranscript(interaction, close = false) {
  const info = topicInfo(interaction.channel), team = teamFor(info.team);
  if (!isStaff(interaction, team)) return interaction.reply({ content: '❌ Apenas a equipe pode salvar o transcript.', ephemeral: true });
  const logId = transcriptChannelId(interaction.guild.id);
  const log = logId ? await interaction.guild.channels.fetch(logId).catch(() => null) : null;
  if (!log?.isTextBased()) return interaction.reply({ content: '❌ Configure um canal de transcript no painel de configuração.', ephemeral: true });
  const html = transcriptHtml(interaction.channel, await transcriptMessages(interaction.channel));
  const saved = await log.send({ content: `📄 Transcript HTML: **${interaction.channel.name}** salvo por ${interaction.user}\nSolicitante: <@${info.userId}>`, files: [new AttachmentBuilder(Buffer.from(html), { name: `${interaction.channel.name}-transcript.html` })] });
  const download = saved.attachments.first()?.url;
  return interaction.reply({ content: download ? `✅ Transcript HTML salvo. [Baixar transcript no navegador](${download})` : '✅ Transcript HTML salvo no canal configurado.', ephemeral: true });
}
async function closeTicket(interaction) {
  const info = topicInfo(interaction.channel), team = teamFor(info.team);
  if (!isStaff(interaction, team)) return interaction.reply({ content: '❌ Somente a equipe pode fechar este ticket.', ephemeral: true });
  await interaction.deferReply({ ephemeral: true });
  const html = transcriptHtml(interaction.channel, await transcriptMessages(interaction.channel)), transcriptName = `${interaction.channel.name}-transcript.html`, makeTranscriptFile = () => new AttachmentBuilder(Buffer.from(html), { name: transcriptName }), logId = transcriptChannelId(interaction.guild.id), log = logId ? await interaction.guild.channels.fetch(logId).catch(() => null) : null;
  if (!log?.isTextBased()) return interaction.editReply({ content: '❌ Não foi possível fechar: configure um canal de transcript válido no /botconfig ticket.' });
  try {
    var saved = await log.send({ content: `📁 Transcript HTML obrigatório: **${interaction.channel.name}** por ${interaction.user}\nSolicitante: <@${info.userId}>`, files: [makeTranscriptFile()] });
  } catch (error) {
    console.error('[TicketControlSuite] transcript before close failed', error);
    return interaction.editReply({ content: '❌ Não foi possível salvar o transcript. O ticket não foi excluído.' });
  }
  if (slaTimers.has(interaction.channel.id)) { clearTimeout(slaTimers.get(interaction.channel.id)); slaTimers.delete(interaction.channel.id); }
  db.ticketStats ||= { opened: 0, closed: 0, ratings: [] }; db.ticketStats.closed = (db.ticketStats.closed || 0) + 1; save();
  const requester = await interaction.guild.members.fetch(info.userId).catch(() => null);
  const download = saved?.attachments.first()?.url;
  if (requester) requester.send({ content: `📄 O transcript HTML do seu ticket **${interaction.channel.name}** foi salvo.${download ? `\n🔗 [Baixar transcript no navegador](${download})` : ''}`, files: [makeTranscriptFile()], components: [new ActionRowBuilder().addComponents(...[1,2,3,4,5].map(n => new ButtonBuilder().setCustomId(`ticket_rate_${n}`).setLabel(String(n)).setStyle(ButtonStyle.Secondary)))] }).catch(error => console.error('[TicketControlSuite] requester transcript DM failed', error));
  await interaction.editReply({ content: download ? `✅ Transcript HTML salvo. [Baixar transcript no navegador](${download})\nO ticket será fechado em instantes.` : '✅ Transcrição HTML salva. O ticket será fechado em instantes.' });
  setTimeout(() => interaction.channel.delete('Ticket encerrado após salvar transcrição').catch(() => {}), 1500);
}
async function handlePurchase(interaction) {
  if (interaction.values[0] === 'none') return interaction.reply({ content: 'Não encontramos compras vinculadas a você. Descreva o pedido manualmente no ticket.', ephemeral: true });
  const found = purchases(interaction).find((p, index) => String(p.id || p.orderId || p.ref || p.externalReference || p.external_reference || index + 1) === interaction.values[0]);
  const summary = found ? `ID: ${found.id || found.orderId || found.ref || found.externalReference || interaction.values[0]} | Produto: ${found.product || found.productName || found.name || found.item || found.description || 'Produto'} | Status: ${found.status || 'não informado'}` : `ID da compra: ${interaction.values[0]}`;
  await interaction.channel.send(`📦 **Compra vinculada ao ticket**\n${summary}\nSolicitante: ${interaction.user}`);
  return interaction.reply({ content: '✅ A compra foi vinculada ao ticket e a equipe já pode analisá-la.', ephemeral: true });
}
function adminPanel() {
  const c = db.ticketConfig;
  const stats = db.ticketStats || { opened: 0, closed: 0, ratings: [] };
  const embed = new EmbedBuilder().setColor(c.panelColor || PURPLE).setTitle('⚙️ Administração de Tickets').setDescription(`**Painel:** ${c.panelTitle}\n**Logs:** ${c.logsChannelId || 'não configurado'}\n**Banner:** ${c.panelImage ? 'configurado' : 'não configurado'}\n**Tickets abertos:** ${stats.opened || 0}\n**Tickets fechados:** ${stats.closed || 0}`);
  return { embeds: [embed], components: [new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId('ticket_admin').setPlaceholder('Escolha uma configuração').addOptions(
    { label: 'Alterar banner', value: 'banner', emoji: '🖼️' },
    { label: 'Definir canal de logs', value: 'logs', emoji: '📝' },
    { label: 'Alterar cor roxa', value: 'color', emoji: '🎨' },
    { label: 'Ver estatísticas', value: 'stats', emoji: '📊' }
  ))] };
}
function configModal(kind) {
  const labels = { banner: ['ticket_banner', 'URL do banner', db.ticketConfig.panelImage || ''], logs: ['ticket_logs', 'ID do canal de logs', db.ticketConfig.logsChannelId || ''], color: ['ticket_color', 'Cor hexadecimal', db.ticketConfig.panelColor || PURPLE] };
  const [id, label, value] = labels[kind];
  return new ModalBuilder().setCustomId(`ticket_config_${kind}`).setTitle(label).addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId(id).setLabel(label).setStyle(TextInputStyle.Short).setRequired(true).setValue(String(value).slice(0, 100))));
}
async function handleAdmin(interaction) {
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) return interaction.reply({ content: '❌ Apenas administradores podem configurar os tickets.', ephemeral: true });
  const choice = interaction.values[0];
  if (choice === 'stats') { const stats = db.ticketStats || {}; return interaction.reply({ content: `📊 Tickets abertos: **${stats.opened || 0}**\nTickets fechados: **${stats.closed || 0}**\nAvaliações: **${(stats.ratings || []).length}**`, ephemeral: true }); }
  return interaction.showModal(configModal(choice));
}
async function handleAdminModal(interaction) {
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) return interaction.reply({ content: '❌ Apenas administradores podem alterar essa configuração.', ephemeral: true });
  const kind = interaction.customId.replace('ticket_config_', '');
  const value = interaction.fields.getTextInputValue(`ticket_${kind}`);
  if (kind === 'banner') db.ticketConfig.panelImage = value;
  if (kind === 'logs') db.ticketConfig.logsChannelId = value.replace(/[^0-9]/g, '');
  if (kind === 'color') db.ticketConfig.panelColor = /^#[0-9a-f]{6}$/i.test(value) ? value : PURPLE;
  save();
  return interaction.reply({ content: '✅ Configuração salva. O próximo painel usará a nova configuração.', ephemeral: true });
}
async function rateTicket(interaction) {
  db.ticketStats ||= { opened: 0, closed: 0, ratings: [] };
  db.ticketStats.ratings ||= [];
  db.ticketStats.ratings.push({ userId: interaction.user.id, rating: Number(interaction.customId.split('_').pop()), at: new Date().toISOString() });
  save();
  return interaction.reply({ content: '✅ Obrigado por avaliar o atendimento!', ephemeral: true });
}

async function install(client) {
  ensure();
  client.once(Events.ClientReady, async ready => {
    await ready.application.commands.create({ name: 'ticket-staff', description: 'Abrir ferramentas privadas da equipe neste ticket' }).catch(error => console.error('[TicketControlSuite] command registration failed', error));
  });
  client.on(Events.InteractionCreate, async interaction => {
    try {
      if (isLegacyPrivateThread(interaction.channel) && String(interaction.customId || '').startsWith('ticket_')) return;
      if (interaction.isButton() && interaction.customId.startsWith('ticket_open_button:')) return interaction.showModal(openTicketModal(interaction.customId.split(':')[1]));
      if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_category') return interaction.showModal(openTicketModal(interaction.values[0]));
      if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_purchase') return handlePurchase(interaction);
      if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_status') return handleTicketStatus(interaction);
      if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_priority') return handleTicketPriority(interaction);
      if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_quick') return handleQuickReply(interaction);
      if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_admin') return handleAdmin(interaction);
      if (interaction.isModalSubmit() && interaction.customId.startsWith('ticket_config_')) return handleAdminModal(interaction);
      if (interaction.isModalSubmit() && interaction.customId.startsWith('ticket_open_')) return handleOpenModal(interaction);
      if (interaction.isModalSubmit() && interaction.customId === 'ticket_transfer') return handleTransfer(interaction);
      if (interaction.isButton() && interaction.customId.startsWith('ticket_rate_')) return rateTicket(interaction);
      if (interaction.isButton() && interaction.customId === 'ticket_notify') return notifyTeam(interaction);
      if (interaction.isButton() && interaction.customId === 'ticket_claim') return claimTicket(interaction);
      if (interaction.isButton() && interaction.customId === 'ticket_transcript') return saveTranscript(interaction);
      if (interaction.isButton() && interaction.customId === 'ticket_close') return closeTicket(interaction);
      if (interaction.isChatInputCommand() && interaction.commandName === 'ticket-staff') return staffPanel(interaction);
      if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_staff_options') {
        if (interaction.values[0] === 'transfer') return interaction.showModal(transferModal());
        if (interaction.values[0] === 'status') return interaction.reply({ ...operationMenu('status'), ephemeral: true });
        if (interaction.values[0] === 'priority') return interaction.reply({ ...operationMenu('priority'), ephemeral: true });
        if (interaction.values[0] === 'quick') return interaction.reply({ ...quickReplyMenu(), ephemeral: true });
        return interaction.reply({ content: '✅ Ferramenta aberta.', ephemeral: true });
      }
      if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_client_options') {
        return interaction.reply({ content: interaction.values[0] === 'purchase' ? 'Use o menu de compras enviado neste ticket para vincular um pedido.' : '👤 Você pode enviar mensagens, anexos e informações do pedido neste ticket.', ephemeral: true });
      }
    } catch (error) {
      console.error('[TicketControlSuite]', error);
      if (!interaction.replied && !interaction.deferred) interaction.reply({ content: '❌ Não foi possível concluir essa ação. Verifique as permissões do bot.', ephemeral: true }).catch(() => {});
    }
  });
  client.on('messageCreate', async message => {
    if (!message.guild || message.author.bot || !message.channel?.topic?.startsWith('ticket:')) return;
    const info = topicInfo(message.channel);
    if (!info.claimedBy || info.claimedBy !== message.author.id) return;
    const targets = new Set([...message.mentions.users.keys(), ...message.mentions.roles.keys()]);
    for (const id of targets) await message.channel.permissionOverwrites.edit(id, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true }).catch(() => {});
  });
}
module.exports = { install, panel, adminPanel, staffPanel, ensure };
function isLegacyPrivateThread(channel) {
  return Boolean(channel?.isThread?.() && /・\d{15,22}$/.test(String(channel.name || '')));
}
