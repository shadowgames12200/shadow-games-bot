const fs = require('fs');
const path = require('path');
const { ChannelType, PermissionFlagsBits, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const DB_PATH = path.join(process.cwd(), 'DataBaseJson', 'shadow-control.json');
function db() { try { return JSON.parse(fs.readFileSync(DB_PATH, 'utf8')); } catch (_) { return { guilds: {} }; } }
function save(v) { fs.mkdirSync(path.dirname(DB_PATH), { recursive: true }); fs.writeFileSync(DB_PATH, JSON.stringify(v, null, 2)); }
function config(v, guildId) { v.guilds[guildId] ||= { panels: [], logs: {}, automod: {}, roles: {}, macros: [], suggestions: [], tickets: {} }; return v.guilds[guildId]; }
function slug(value) { return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').slice(0, 35); }
const labels = { vendas: 'Compras e vendas', suporte: 'Suporte', cobranca: 'Cobrança', posvenda: 'Pós-venda', parcerias: 'Parcerias' };
function install(client) {
  client.on('interactionCreate', async interaction => {
    if (!interaction.isButton() || !interaction.customId.startsWith('shadow:ticket:')) return;
    const kind = interaction.customId.split(':')[2];
    if (!interaction.guild) return interaction.reply({ content: '❌ Este painel só funciona dentro de um servidor.', ephemeral: true });
    const existing = interaction.guild.channels.cache.find(c => c.name === `ticket-${slug(kind)}-${interaction.user.id.slice(-5)}`);
    if (existing) return interaction.reply({ content: `❌ Você já possui um ticket aberto: ${existing}`, ephemeral: true });
    const state = db(); const cfg = config(state, interaction.guildId); const supportRole = cfg.staffRoleId;
    const overwrites = [
      { id: interaction.guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
      { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
      { id: client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ReadMessageHistory] },
    ];
    if (supportRole) overwrites.push({ id: supportRole, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] });
    const channel = await interaction.guild.channels.create({ name: `ticket-${slug(kind)}-${interaction.user.id.slice(-5)}`, type: ChannelType.GuildText, permissionOverwrites: overwrites, topic: `Shadow ticket | tipo=${kind} | autor=${interaction.user.id}` });
    cfg.tickets[channel.id] = { kind, authorId: interaction.user.id, status: 'aberto', openedAt: new Date().toISOString() }; save(state);
    const controls = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('shadow:ticket:claim').setLabel('Assumir').setEmoji('🙋').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('shadow:ticket:priority').setLabel('Prioridade').setEmoji('⚑').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('shadow:ticket:close').setLabel('Fechar').setEmoji('🔒').setStyle(ButtonStyle.Danger),
    );
    await channel.send({ content: `<@${interaction.user.id}>${supportRole ? ` <@&${supportRole}>` : ''}`, embeds: [new EmbedBuilder().setColor(0x5865f2).setTitle(`${labels[kind] || kind} — atendimento`).setDescription('Explique o que você precisa. Nunca envie senhas, tokens ou dados completos de cartão.').addFields({ name: 'Status', value: 'Aberto', inline: true }, { name: 'Responsável', value: 'Aguardando equipe', inline: true })], components: [controls] });
    return interaction.reply({ content: `✅ Ticket criado: ${channel}`, ephemeral: true });
  });
  client.on('interactionCreate', async interaction => {
    if (!interaction.isButton() || !interaction.customId.startsWith('shadow:ticket:')) return;
    const action = interaction.customId.split(':')[2];
    if (!['claim', 'priority', 'close'].includes(action) || !interaction.channel?.name?.startsWith('ticket-')) return;
    const state = db(); const cfg = config(state, interaction.guildId); const item = cfg.tickets[interaction.channelId] || {};
    if (action === 'claim') { item.claimedBy = interaction.user.id; item.status = 'em atendimento'; cfg.tickets[interaction.channelId] = item; save(state); return interaction.reply(`✅ Ticket assumido por <@${interaction.user.id}>.`); }
    if (action === 'priority') { item.priority = item.priority === 'alta' ? 'normal' : 'alta'; cfg.tickets[interaction.channelId] = item; save(state); return interaction.reply(`⚑ Prioridade: **${item.priority}**`); }
    if (action === 'close') { item.status = 'fechado'; item.closedBy = interaction.user.id; item.closedAt = new Date().toISOString(); cfg.tickets[interaction.channelId] = item; save(state); await interaction.reply('🔒 Ticket fechado. Este canal será arquivado/renomeado.'); return interaction.channel.setName(`fechado-${interaction.channel.name.replace(/^ticket-/, '')}`).catch(() => {}); }
  });
}
module.exports = { install };
