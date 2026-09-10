const {
  Events, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle,
  EmbedBuilder, PermissionFlagsBits, ChannelType, AttachmentBuilder
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
    { label: 'Informar pedido', description: 'Vincular uma compra a este ticket', value: 'purchase', emoji: '📦' }
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
async function createTicket(interaction, key) {
  const team = teamFor(key), guild = interaction.guild;
  const existing = guild.channels.cache.find(channel => topicInfo(channel).userId === interaction.user.id && topicInfo(channel).team === key);
  if (existing) return interaction.reply({ content: `Você já possui um ticket aberto nesta categoria: ${existing}`, ephemeral: true });
  const permissions = [
    { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
    { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles] },
    { id: guild.members.me.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageMessages] }
  ];
  if (team.roleId) permissions.push({ id: team.roleId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] });
  const channel = await guild.channels.create({ name: `${slug(team.name)}-${slug(interaction.user.username)}-${String(interaction.user.id).slice(-4)}`, type: ChannelType.GuildText, parent: team.categoryId || undefined, topic: `ticket:${interaction.user.id}:${key}`, permissionOverwrites: permissions });
  const embed = new EmbedBuilder().setColor(PURPLE).setTitle(`🎫 ${team.name}`).setDescription(`Olá ${interaction.user}, seu ticket foi criado!\n\nNossa equipe irá atendê-lo em breve.\n\n**Categoria:** ${team.name}\n**Solicitante:** ${interaction.user.tag}`);
  await channel.send({ content: `${interaction.user}${team.roleId ? ` <@&${team.roleId}>` : ''}`, embeds: [embed], components: [ticketButtons(), optionMenu()] });
  if (key === 'suporte' || key === 'financeiro') await channel.send(purchasePanel(interaction));
  return interaction.reply({ content: `✅ Seu ticket foi criado: ${channel}`, ephemeral: true });
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
async function install(client) {
  ensure();
  client.on(Events.InteractionCreate, async interaction => {
    try {
      if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_category') return createTicket(interaction, interaction.values[0]);
      if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_purchase') return handlePurchase(interaction);
      if (interaction.isButton() && interaction.customId === 'ticket_notify') return notifyTeam(interaction);
      if (interaction.isButton() && interaction.customId === 'ticket_claim') return claimTicket(interaction);
      if (interaction.isButton() && interaction.customId === 'ticket_close') return closeTicket(interaction);
      if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_options') return interaction.reply({ content: interaction.values[0] === 'purchase' ? 'Use o menu de compras enviado neste ticket para vincular um pedido.' : interaction.values[0] === 'staff' ? '🛠️ Ferramentas Staff: assumir, notificar e salvar o ticket.' : '👤 Você pode enviar mensagens, anexos e informações do pedido neste ticket.', ephemeral: true });
      if (interaction.isChatInputCommand() && interaction.commandName === 'ticket' && interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) return interaction.reply(panel());
    } catch (error) {
      console.error('[TicketControlSuite]', error);
      if (!interaction.replied && !interaction.deferred) interaction.reply({ content: '❌ Não foi possível concluir essa ação. Verifique as permissões do bot.', ephemeral: true }).catch(() => {});
    }
  });
}
module.exports = { install, panel, ensure };
