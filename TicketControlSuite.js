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

function ensure() {
  db.ticketConfig ||= {};
  db.ticketStats ||= { opened: 0, closed: 0, ratings: [] };
  Object.assign(db.ticketConfig, {
    panelTitle: 'Central de Atendimento | Shadow Games',
    panelDescription: 'Ao abrir um ticket, um integrante da equipe irá lhe responder. Nosso atendimento é privado, rápido e eficiente, disponível 24 horas por dia, sujeito à disponibilidade em horários de pico.',
    panelColor: PURPLE, panelImage: '', logsChannelId: '', claimRole: '', closeRole: '', ...db.ticketConfig
  });
  db.ticketConfig.permissions ||= {};
  db.ticketConfig.teams = { ...DEFAULT_TEAMS, ...(db.ticketConfig.teams || {}) };
  for (const [key, team] of Object.entries(db.ticketConfig.teams)) db.ticketConfig.teams[key] = { ...DEFAULT_TEAMS[key], ...team };
  save();
}

const slug = value => String(value || 'usuario').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').slice(0, 24).replace(/^-|-$/g, '') || 'usuario';
const topicInfo = channel => { const p = String(channel?.topic || '').split(':'); return p[0] === 'ticket' ? { userId: p[1], team: p[2], claimedBy: p[3] || '' } : {}; };
const isStaff = (interaction, team = {}) => Boolean(interaction.memberPermissions?.has(PermissionFlagsBits.Administrator) || interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels) || [team.roleId, db.ticketConfig.claimRole, db.ticketConfig.closeRole, db.ticketConfig.permissions?.claimRole, db.ticketConfig.permissions?.closeRole].filter(Boolean).some(id => interaction.member?.roles?.cache?.has(id)));
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
function ticketButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ticket_notify').setLabel('Notificar equipe').setEmoji('🔔').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('ticket_claim').setLabel('Assumir Ticket').setEmoji('🔒').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('ticket_close').setLabel('Deletar e Salvar').setEmoji('🗑️').setStyle(ButtonStyle.Danger)
  );
}
function optionMenu() {
  return new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId('ticket_options').setPlaceholder('Selecione um painel de opções').addOptions(
    { label: 'Painel Staff', description: 'Ferramentas para a equipe', value: 'staff', emoji: '🛠️' },
    { label: 'Opções Clientes', description: 'Opções disponíveis para você', value: 'client', emoji: '👤' },
    { label: 'Informar pedido', description: 'Vincular uma compra a este ticket', value: 'purchase', emoji: '📦' },
    { label: 'Transferir atendimento', description: 'Mover para outro setor ou atendente', value: 'transfer', emoji: '🔁' }
  ));
}
function purchases(interaction) {
  const source = db.purchases || db.purchaseHistory || db.orders || {};
  const list = Array.isArray(source) ? source.filter(p => String(p.userId || p.user || p.discordId || p.customerId) === String(interaction.user.id)) : source[interaction.user.id] || [];
  return Array.isArray(list) ? list.slice(-25) : [];
}
function purchasePanel(interaction) {
  const list = purchases(interaction);
  const options = list.map((p, index) => ({ label: `ID: ${p.id || p.orderId || index + 1} - ${String(p.product || p.name || p.item || 'Produto').slice(0, 75)}`, value: String(p.id || p.orderId || index + 1) }));
  return { embeds: [new EmbedBuilder().setColor(PURPLE).setTitle('Compras encontradas').setDescription('Caso o ticket seja referente a um pedido já efetuado, selecione a compra abaixo.')], components: [new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId('ticket_purchase').setPlaceholder('Selecione uma das últimas compras').addOptions(options.length ? options : [{ label: 'Nenhuma compra encontrada', value: 'none', emoji: '📦' }]))] };
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
  if (team.roleId) permissions.push({ id: team.roleId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] });
  const channel = await guild.channels.create({ name: `${slug(team.name)}-${slug(interaction.user.username)}-${String(interaction.user.id).slice(-4)}`, type: ChannelType.GuildText, parent: team.categoryId || undefined, topic: `ticket:${interaction.user.id}:${key}`, permissionOverwrites: permissions });
  const formText = form ? `\n\n**Nome:** ${form.name}\n**Pedido/compra:** ${form.order}\n**Descrição:** ${form.problem}` : '';
  const embed = new EmbedBuilder().setColor(PURPLE).setTitle(`🎫 ${team.name}`).setDescription(`Olá ${interaction.user}, seu ticket foi criado!\n\nNossa equipe irá atendê-lo em breve.\n\n**Categoria:** ${team.name}\n**Solicitante:** ${interaction.user.tag}${formText}`);
  await channel.send({ content: `${interaction.user}${team.roleId ? ` <@&${team.roleId}>` : ''}`, embeds: [embed], components: [ticketButtons(), optionMenu()] });
  if (key === 'suporte' || key === 'financeiro') await channel.send(purchasePanel(interaction));
  db.ticketStats.opened = (db.ticketStats.opened || 0) + 1; save();
  return interaction.reply({ content: `✅ Seu ticket foi criado: ${channel}`, ephemeral: true });
}
function openTicketModal(key) {
  return new ModalBuilder().setCustomId(`ticket_open_${key}`).setTitle(`Abrir ${teamFor(key).name}`).addComponents(
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('ticket_open_name').setLabel('Seu nome ou apelido').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(80)),
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('ticket_open_order').setLabel('ID do pedido ou produto (opcional)').setStyle(TextInputStyle.Short).setRequired(false).setMaxLength(100)),
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('ticket_open_problem').setLabel('Explique como podemos ajudar').setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(1000))
  );
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
  await interaction.channel.setTopic(`ticket:${info.userId}:${key}:${attendant || info.claimedBy || ''}`);
  if (target.roleId) await interaction.channel.permissionOverwrites.edit(target.roleId, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true }).catch(() => {});
  if (attendant) await interaction.channel.permissionOverwrites.edit(attendant, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true }).catch(() => {});
  await interaction.channel.send(`🔁 Atendimento transferido para **${target.name}**${attendant ? ` e atribuído a <@${attendant}>` : ''} por ${interaction.user}.`);
  return interaction.reply({ content: '✅ Ticket transferido com sucesso.', ephemeral: true });
}
async function handleOpenModal(interaction) {
  const key = interaction.customId.replace('ticket_open_', '');
  const form = { name: interaction.fields.getTextInputValue('ticket_open_name'), order: interaction.fields.getTextInputValue('ticket_open_order') || 'Não informado', problem: interaction.fields.getTextInputValue('ticket_open_problem') };
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
  await interaction.channel.setTopic(`ticket:${info.userId}:${info.team}:${interaction.user.id}`);
  if (team.roleId) await interaction.channel.permissionOverwrites.edit(team.roleId, { SendMessages: false }).catch(() => {});
  return interaction.reply({ content: `🔒 Ticket assumido por ${interaction.user}. Os demais atendentes não poderão assumir este ticket.` });
}
async function transcript(channel) {
  const messages = [];
  let before;
  while (true) {
    const batch = await channel.messages.fetch({ limit: 100, ...(before ? { before } : {}) });
    if (!batch.size) break;
    messages.push(...batch.values());
    before = batch.last().id;
    if (batch.size < 100) break;
  }
  return messages.reverse().map(message => {
    const attachments = [...message.attachments.values()].map(file => file.url).join(' ');
    const embeds = message.embeds.length ? ` [${message.embeds.map(embed => embed.title || embed.description || 'embed').join(' | ')}]` : '';
    return `[${message.createdAt.toISOString()}] ${message.author.tag}: ${message.content || ''}${embeds}${attachments ? ` Anexos: ${attachments}` : ''}`;
  }).join('\n');
}
async function closeTicket(interaction) {
  const info = topicInfo(interaction.channel), team = teamFor(info.team);
  if (!isStaff(interaction, team)) return interaction.reply({ content: '❌ Somente a equipe pode fechar este ticket.', ephemeral: true });
  await interaction.deferReply({ ephemeral: true });
  const content = await transcript(interaction.channel), log = db.ticketConfig.logsChannelId ? await interaction.guild.channels.fetch(db.ticketConfig.logsChannelId).catch(() => null) : null;
  if (log?.isTextBased()) await log.send({ content: `📁 Ticket fechado: **${interaction.channel.name}** por ${interaction.user}\nSolicitante: <@${info.userId}>`, files: [new AttachmentBuilder(Buffer.from(content || 'Sem mensagens.'), { name: `${interaction.channel.name}.txt` })] });
  db.ticketStats ||= { opened: 0, closed: 0, ratings: [] }; db.ticketStats.closed = (db.ticketStats.closed || 0) + 1; save();
  const requester = await interaction.guild.members.fetch(info.userId).catch(() => null);
  if (requester) requester.send({ content: 'Como foi o atendimento deste ticket?', components: [new ActionRowBuilder().addComponents(...[1,2,3,4,5].map(n => new ButtonBuilder().setCustomId(`ticket_rate_${n}`).setLabel(String(n)).setStyle(ButtonStyle.Secondary)))] }).catch(() => {});
  await interaction.editReply({ content: '✅ Transcrição completa salva. O ticket será deletado em instantes.' });
  setTimeout(() => interaction.channel.delete('Ticket encerrado após salvar transcrição').catch(() => {}), 1500);
}
async function handlePurchase(interaction) {
  if (interaction.values[0] === 'none') return interaction.reply({ content: 'Não encontramos compras vinculadas a você. Descreva o pedido manualmente no ticket.', ephemeral: true });
  const found = purchases(interaction).find((p, index) => String(p.id || p.orderId || index + 1) === interaction.values[0]);
  const summary = found ? `ID: ${found.id || found.orderId || interaction.values[0]} | Produto: ${found.product || found.name || found.item || 'Produto'} | Status: ${found.status || 'não informado'}` : `ID da compra: ${interaction.values[0]}`;
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
  client.on(Events.InteractionCreate, async interaction => {
    try {
      if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_category') return interaction.showModal(openTicketModal(interaction.values[0]));
      if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_purchase') return handlePurchase(interaction);
      if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_admin') return handleAdmin(interaction);
      if (interaction.isModalSubmit() && interaction.customId.startsWith('ticket_config_')) return handleAdminModal(interaction);
      if (interaction.isModalSubmit() && interaction.customId.startsWith('ticket_open_')) return handleOpenModal(interaction);
      if (interaction.isModalSubmit() && interaction.customId === 'ticket_transfer') return handleTransfer(interaction);
      if (interaction.isButton() && interaction.customId.startsWith('ticket_rate_')) return rateTicket(interaction);
      if (interaction.isButton() && interaction.customId === 'ticket_notify') return notifyTeam(interaction);
      if (interaction.isButton() && interaction.customId === 'ticket_claim') return claimTicket(interaction);
      if (interaction.isButton() && interaction.customId === 'ticket_close') return closeTicket(interaction);
      if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_options') {
        if (interaction.values[0] === 'transfer') return interaction.showModal(transferModal());
        return interaction.reply({ content: interaction.values[0] === 'purchase' ? 'Use o menu de compras enviado neste ticket para vincular um pedido.' : interaction.values[0] === 'staff' ? '🛠️ Ferramentas Staff: assumir, notificar e salvar o ticket.' : '👤 Você pode enviar mensagens, anexos e informações do pedido neste ticket.', ephemeral: true });
      }
    } catch (error) {
      console.error('[TicketControlSuite]', error);
      if (!interaction.replied && !interaction.deferred) interaction.reply({ content: '❌ Não foi possível concluir essa ação. Verifique as permissões do bot.', ephemeral: true }).catch(() => {});
    }
  });
}
module.exports = { install, panel, adminPanel, ensure };
