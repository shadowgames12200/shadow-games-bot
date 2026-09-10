const fs = require('fs');
const path = require('path');
const {
  SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder,
  ButtonBuilder, ButtonStyle, ChannelType, PermissionOverwrites,
} = require('discord.js');

const DB_PATH = path.join(process.cwd(), 'DataBaseJson', 'shadow-control.json');
function readDb() {
  try { return JSON.parse(fs.readFileSync(DB_PATH, 'utf8')); }
  catch (_) { return { guilds: {} }; }
}
function writeDb(db) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}
function guildConfig(db, guildId) {
  db.guilds[guildId] ||= { panels: [], logs: {}, automod: {}, roles: {}, macros: [], suggestions: [], tickets: {} };
  return db.guilds[guildId];
}
function isStaff(interaction, cfg) {
  if (interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) return true;
  const ids = [cfg.staffRoleId, cfg.supervisorRoleId].filter(Boolean);
  return ids.some(id => interaction.member?.roles?.cache?.has(id));
}
function safeText(value, fallback = 'não configurado') {
  return String(value || fallback).slice(0, 900);
}
function panelEmbed(cfg) {
  return new EmbedBuilder().setColor(cfg.color || 0x5865f2)
    .setTitle(cfg.title || 'Atendente Shadow — Central de atendimento')
    .setDescription(cfg.description || 'Escolha uma opção abaixo para falar com a equipe.')
    .setFooter({ text: 'Atendente Shadow • painel configurável' });
}
function panelComponents() {
  return [new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('shadow:ticket:vendas').setLabel('Compras e vendas').setEmoji('🛒').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('shadow:ticket:suporte').setLabel('Suporte').setEmoji('🛠️').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('shadow:ticket:cobranca').setLabel('Cobrança').setEmoji('💳').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('shadow:ticket:posvenda').setLabel('Pós-venda').setEmoji('📦').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('shadow:ticket:parcerias').setLabel('Parcerias').setEmoji('🤝').setStyle(ButtonStyle.Secondary),
  )];
}

const data = new SlashCommandBuilder()
  .setName('shadow').setDescription('Central unificada de tickets, logs, automod, cargos e automações')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild.toString())
  .addSubcommand(s => s.setName('ajuda').setDescription('Lista os módulos e subcomandos disponíveis'))
  .addSubcommand(s => s.setName('painel').setDescription('Publica o painel configurável de tickets').addChannelOption(o => o.setName('canal').setDescription('Canal de publicação').addChannelTypes(ChannelType.GuildText)))
  .addSubcommand(s => s.setName('config').setDescription('Configura título, descrição e cargo de atendimento')
    .addStringOption(o => o.setName('titulo').setDescription('Título do painel'))
    .addStringOption(o => o.setName('descricao').setDescription('Descrição do painel'))
    .addRoleOption(o => o.setName('cargo').setDescription('Cargo da equipe de atendimento')))
  .addSubcommand(s => s.setName('logs').setDescription('Define o canal de auditoria').addChannelOption(o => o.setName('canal').setDescription('Canal de logs').addChannelTypes(ChannelType.GuildText)))
  .addSubcommand(s => s.setName('automod').setDescription('Ativa ou desativa proteção básica contra spam e links')
    .addBooleanOption(o => o.setName('ativo').setDescription('Ativar proteção').setRequired(true)))
  .addSubcommand(s => s.setName('macro').setDescription('Salva uma resposta rápida de atendimento')
    .addStringOption(o => o.setName('nome').setDescription('Nome da macro').setRequired(true))
    .addStringOption(o => o.setName('mensagem').setDescription('Texto da resposta').setRequired(true)))
  .addSubcommand(s => s.setName('sugestao').setDescription('Cria uma sugestão para votação').addStringOption(o => o.setName('texto').setDescription('Sugestão').setRequired(true)))
  .addSubcommand(s => s.setName('ticket').setDescription('Gerencia o ticket atual')
    .addStringOption(o => o.setName('acao').setDescription('Ação').setRequired(true).addChoices(
      { name: 'assumir', value: 'claim' }, { name: 'liberar', value: 'unclaim' }, { name: 'fechar', value: 'close' },
      { name: 'prioridade', value: 'priority' }, { name: 'adicionar', value: 'add' }, { name: 'remover', value: 'remove' },
    ))
    .addUserOption(o => o.setName('usuario').setDescription('Usuário para adicionar/remover'))
    .addStringOption(o => o.setName('motivo').setDescription('Motivo ou observação')));

async function run(_client, interaction) {
  const db = readDb(); const cfg = guildConfig(db, interaction.guildId); const sub = interaction.options.getSubcommand();
  if (sub === 'ajuda') return interaction.reply({ ephemeral: true, embeds: [new EmbedBuilder().setColor(0x5865f2).setTitle('Atendente Shadow — módulos').setDescription('`painel` tickets • `config` personalização • `logs` auditoria • `automod` proteção • `macro` respostas rápidas • `sugestao` votação • `ticket` ações operacionais')] });
  if (!isStaff(interaction, cfg) && sub !== 'ajuda') return interaction.reply({ content: '❌ Você não tem permissão para configurar o Atendente Shadow.', ephemeral: true });
  if (sub === 'config') {
    const title = interaction.options.getString('titulo'); const description = interaction.options.getString('descricao'); const role = interaction.options.getRole('cargo');
    if (title) cfg.title = title; if (description) cfg.description = description; if (role) cfg.staffRoleId = role.id; writeDb(db);
    return interaction.reply({ content: '✅ Configuração salva. Use `/shadow painel` para publicar uma nova versão.', ephemeral: true });
  }
  if (sub === 'logs') { const ch = interaction.options.getChannel('canal'); cfg.logs.auditChannelId = ch.id; writeDb(db); return interaction.reply({ content: `✅ Auditoria direcionada para <#${ch.id}>.`, ephemeral: true }); }
  if (sub === 'automod') { cfg.automod.enabled = interaction.options.getBoolean('ativo'); writeDb(db); return interaction.reply({ content: `✅ AutoMod básico ${cfg.automod.enabled ? 'ativado' : 'desativado'}.`, ephemeral: true }); }
  if (sub === 'macro') { cfg.macros = cfg.macros.filter(m => m.name !== interaction.options.getString('nome')); cfg.macros.push({ name: interaction.options.getString('nome'), message: interaction.options.getString('mensagem') }); writeDb(db); return interaction.reply({ content: '✅ Macro salva.', ephemeral: true }); }
  if (sub === 'sugestao') { cfg.suggestions.push({ text: interaction.options.getString('texto'), authorId: interaction.user.id, createdAt: new Date().toISOString() }); writeDb(db); return interaction.reply({ content: `💡 Sugestão registrada: ${interaction.options.getString('texto')}`, ephemeral: false }); }
  if (sub === 'painel') { const ch = interaction.options.getChannel('canal') || interaction.channel; const msg = await ch.send({ embeds: [panelEmbed(cfg)], components: panelComponents() }); cfg.panels.push({ channelId: ch.id, messageId: msg.id, createdAt: new Date().toISOString() }); writeDb(db); return interaction.reply({ content: `✅ Painel publicado em <#${ch.id}>.`, ephemeral: true }); }
  if (sub === 'ticket') {
    const action = interaction.options.getString('acao'); const reason = interaction.options.getString('motivo') || 'sem motivo informado';
    if (!interaction.channel?.name?.startsWith('ticket-')) return interaction.reply({ content: '❌ Este comando precisa ser usado dentro de um canal de ticket.', ephemeral: true });
    if (action === 'claim') { cfg.tickets[interaction.channelId] = { ...(cfg.tickets[interaction.channelId] || {}), claimedBy: interaction.user.id }; writeDb(db); return interaction.reply(`✅ Ticket assumido por <@${interaction.user.id}>.`); }
    if (action === 'unclaim') { if (cfg.tickets[interaction.channelId]) delete cfg.tickets[interaction.channelId].claimedBy; writeDb(db); return interaction.reply('✅ Ticket liberado para a equipe.'); }
    if (action === 'priority') { cfg.tickets[interaction.channelId] = { ...(cfg.tickets[interaction.channelId] || {}), priority: reason }; writeDb(db); return interaction.reply(`⚑ Prioridade atualizada: **${safeText(reason)}**`); }
    const user = interaction.options.getUser('usuario');
    if ((action === 'add' || action === 'remove') && !user) return interaction.reply({ content: '❌ Informe o usuário.', ephemeral: true });
    if (action === 'add') { await interaction.channel.permissionOverwrites.edit(user.id, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true }); return interaction.reply(`✅ <@${user.id}> adicionado ao ticket.`); }
    if (action === 'remove') { await interaction.channel.permissionOverwrites.delete(user.id).catch(() => {}); return interaction.reply(`✅ <@${user.id}> removido do ticket.`); }
    if (action === 'close') { await interaction.reply(`🔒 Ticket fechado por <@${interaction.user.id}>. Motivo: ${safeText(reason)}`); await interaction.channel.setArchived?.(true).catch(() => {}); return interaction.channel.setName(`fechado-${interaction.channel.name.replace(/^ticket-/, '')}`).catch(() => {}); }
  }
}
module.exports = { name: 'shadow', description: data.description, type: 1, data, run };
