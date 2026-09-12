const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits
} = require('discord.js');
const { db } = require('./ProfessionalSuite');

const DEFAULT_BUTTONS = ['notify', 'claim', 'transcript', 'close'];

function ticketInfo(channel) {
  const parts = String(channel?.topic || '').split(':');
  return parts[0] === 'ticket'
    ? { userId: parts[1], team: parts[2] || 'suporte' }
    : {};
}

function staffRoleIds(team) {
  const configured = db.ticketConfig || {};
  return [...new Set([
    team?.roleId,
    ...(team?.roleIds || []),
    ...(configured.assumeRoleIds || []),
    configured.claimRole,
    configured.closeRole,
    configured.permissions?.claimRole,
    configured.permissions?.closeRole
  ].filter(Boolean))];
}

function isStaff(interaction, team) {
  return Boolean(
    interaction.memberPermissions?.has(PermissionFlagsBits.Administrator) ||
    interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels) ||
    staffRoleIds(team).some(id => interaction.member?.roles?.cache?.has(id))
  );
}

function configuredButtons(guildId) {
  const configured = db.botConfig?.[guildId]?.ticket?.internal?.buttons;
  return Array.isArray(configured) && configured.length ? configured : DEFAULT_BUTTONS;
}

function controlButtons(guildId) {
  const definitions = {
    notify: () => new ButtonBuilder().setCustomId('ticket_notify').setLabel('Notificar equipe').setEmoji('🔔').setStyle(ButtonStyle.Secondary),
    claim: () => new ButtonBuilder().setCustomId('ticket_claim').setLabel('Assumir Ticket').setEmoji('🔒').setStyle(ButtonStyle.Primary),
    transcript: () => new ButtonBuilder().setCustomId('ticket_transcript').setLabel('Salvar transcript').setEmoji('📄').setStyle(ButtonStyle.Secondary),
    close: () => new ButtonBuilder().setCustomId('ticket_close').setLabel('Deletar e Salvar').setEmoji('🗑️').setStyle(ButtonStyle.Danger)
  };
  const buttons = configuredButtons(guildId).filter(key => definitions[key]).map(key => definitions[key]());
  return buttons.length ? new ActionRowBuilder().addComponents(buttons) : null;
}

function staffPanel(interaction) {
  const info = ticketInfo(interaction.channel);
  if (!info.userId) return interaction.reply({ content: '❌ Use este comando dentro de um canal de ticket.', ephemeral: true });
  const teams = db.ticketConfig?.teams || {};
  const team = teams[info.team] || teams.suporte || {};
  if (!isStaff(interaction, team)) return interaction.reply({ content: '❌ Apenas a equipe pode abrir as ferramentas do ticket.', ephemeral: true });

  const tools = new ActionRowBuilder().addComponents(new StringSelectMenuBuilder()
    .setCustomId('ticket_staff_options')
    .setPlaceholder('Mais ferramentas')
    .addOptions(
      { label: 'Transferir atendimento', description: 'Mover para outro setor ou atendente', value: 'transfer', emoji: '🔁' },
      { label: 'Alterar status', description: 'Atualizar o andamento do atendimento', value: 'status', emoji: '📌' },
      { label: 'Definir prioridade', description: 'Marcar urgência do ticket', value: 'priority', emoji: '🚦' },
      { label: 'Respostas rápidas', description: 'Enviar uma mensagem pronta', value: 'quick', emoji: '⚡' }
    ));
  const components = [tools];
  const controls = controlButtons(interaction.guild.id);
  if (controls) components.unshift(controls);
  return interaction.reply({ content: '🛠️ Ferramentas da equipe', components, ephemeral: true });
}

module.exports = { staffPanel };
