const {
  Events, ModalBuilder, ActionRowBuilder, TextInputBuilder, TextInputStyle,
  EmbedBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, ChannelType
} = require('discord.js');
const { db, save, closeTicket } = require('./ProfessionalSuite');

function ensure() {
  db.teams ||= {};
  db.forms ||= {};
  db.supportMetrics ||= { firstResponseMs: [], resolutionMs: [], byTeam: {}, byAgent: {} };
  save();
}
function team(key) { return db.teams[key] || { name: key, roleId: db.settings.ticketTeamRoleId || '', categoryId: db.settings.ticketCategoryId || '', enabled: true }; }
function form(key) { return db.forms[key] || { title: `Atendimento ${key}`, questions: ['Explique sua necessidade'], team: key }; }
function modalFor(key) {
  const cfg = form(key);
  const modal = new ModalBuilder().setCustomId(`advanced_ticket_form:${key}`).setTitle(String(cfg.title).slice(0, 45));
  const questions = (cfg.questions || ['Explique sua necessidade']).slice(0, 5);
  modal.addComponents(...questions.map((question, i) => new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId(`answer_${i}`).setLabel(String(question).slice(0, 45)).setStyle(i === 0 ? TextInputStyle.Paragraph : TextInputStyle.Short).setRequired(true).setMaxLength(1000))));
  return modal;
}
async function createTicket(interaction, key) {
  const cfg = team(key); const f = form(key); const answers = (f.questions || []).slice(0, 5).map((q, i) => ({ question: q, answer: interaction.fields.getTextInputValue(`answer_${i}`) }));
  const guild = interaction.guild; const safe = String(key).replace(/[^a-z0-9-]/gi, '-').slice(0, 20);
  const overwrites = [{ id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] }, { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] }];
  if (cfg.roleId) overwrites.push({ id: cfg.roleId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] });
  const channel = await guild.channels.create({ name: `ticket-${safe}-${interaction.user.username}`.slice(0, 95), type: ChannelType.GuildText, parent: cfg.categoryId || undefined, permissionOverwrites: overwrites, topic: JSON.stringify({ ownerId: interaction.user.id, team: key, lastActivity: Date.now(), firstResponseAt: null }) });
  const ticket = { channelId: channel.id, ownerId: interaction.user.id, team: key, status: 'open', priority: 'normal', openedAt: Date.now(), lastActivity: Date.now(), firstResponseAt: null, slaDueAt: Date.now() + Number(db.settings.slaHours || 24) * 3600000, answers };
  db.tickets[channel.id] = ticket; db.stats.opened++; db.stats.byTeam[key] = (db.stats.byTeam[key] || 0) + 1; save();
  const description = answers.map(x => `**${x.question}**\n${x.answer}`).join('\n\n');
  await channel.send({ content: `<@${interaction.user.id}>${cfg.roleId ? ` <@&${cfg.roleId}>` : ''}`, embeds: [new EmbedBuilder().setColor(0x57f287).setTitle(f.title).setDescription(description)], components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('ticket_close').setLabel('Fechar ticket').setStyle(ButtonStyle.Danger), new ButtonBuilder().setCustomId('ticket_claim').setLabel('Assumir').setStyle(ButtonStyle.Primary), new ButtonBuilder().setCustomId('ticket_pending').setLabel('Pendente').setStyle(ButtonStyle.Secondary), new ButtonBuilder().setCustomId('ticket_resolved').setLabel('Resolvido').setStyle(ButtonStyle.Success))] });
  return interaction.reply({ content: `✅ Atendimento encaminhado para **${cfg.name}**: ${channel}`, ephemeral: true });
}
function install(client) {
  ensure();
  client.on(Events.InteractionCreate, async interaction => {
    try {
      if (interaction.isButton() && interaction.customId.startsWith('advanced_ticket_open:')) return interaction.showModal(modalFor(interaction.customId.split(':')[1]));
      if (interaction.isModalSubmit() && interaction.customId.startsWith('advanced_ticket_form:')) return createTicket(interaction, interaction.customId.split(':')[1]);
      if (interaction.isButton() && ['ticket_pending', 'ticket_resolved'].includes(interaction.customId)) { const ticket = db.tickets[interaction.channelId]; if (!ticket) return interaction.reply({ content: '❌ Ticket não encontrado.', ephemeral: true }); if (!ticket.agentId && !interaction.memberPermissions.has(PermissionFlagsBits.ManageChannels)) return interaction.reply({ content: '❌ Assuma o ticket antes de alterar o status.', ephemeral: true }); ticket.status = interaction.customId === 'ticket_pending' ? 'pending' : 'resolved'; ticket.lastActivity = Date.now(); save(); return interaction.reply({ content: `✅ Status atualizado para **${ticket.status}**.`, ephemeral: true }); }
    } catch (error) { console.error('[AdvancedSupport]', error); if (!interaction.replied && !interaction.deferred) await interaction.reply({ content: '❌ Não foi possível abrir o atendimento.', ephemeral: true }).catch(() => {}); }
  });
  client.on(Events.MessageCreate, message => {
    if (!message.guild || message.author.bot || !db.tickets[message.channelId]) return;
    const ticket = db.tickets[message.channelId]; ticket.lastActivity = Date.now();
    if (!ticket.firstResponseAt && message.author.id !== ticket.ownerId) { ticket.firstResponseAt = Date.now(); db.supportMetrics.firstResponseMs.push(ticket.firstResponseAt - ticket.openedAt); }
    if (ticket.agentId) { db.supportMetrics.byAgent[ticket.agentId] ||= { messages: 0, closed: 0 }; db.supportMetrics.byAgent[ticket.agentId].messages++; }
    save();
  });
}
module.exports = { install, ensure, team, form };
