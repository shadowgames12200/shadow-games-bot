const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { setChannel, status } = require('../../LogSuite');

const GROUPS = {
  membros: 'members', mensagens: 'messages', tickets: 'tickets', voz: 'voice',
  canais: 'channels', cargos: 'roles', convites: 'invites', moderacao: 'moderation',
  servidor: 'server', threads: 'threads'
};

const data = new SlashCommandBuilder()
  .setName('logs')
  .setDescription('Configura os canais de logs do servidor')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild.bitfield)
  .addSubcommand(sub => sub.setName('canal').setDescription('Define o canal de uma categoria')
    .addStringOption(option => option.setName('categoria').setDescription('Categoria').setRequired(true).addChoices(...Object.keys(GROUPS).map(name => ({ name, value: name }))))
    .addChannelOption(option => option.setName('canal').setDescription('Canal de destino').setRequired(true).addChannelTypes(ChannelType.GuildText)))
  .addSubcommand(sub => sub.setName('remover').setDescription('Remove o canal separado da categoria')
    .addStringOption(option => option.setName('categoria').setDescription('Categoria').setRequired(true).addChoices(...Object.keys(GROUPS).map(name => ({ name, value: name })))))
  .addSubcommand(sub => sub.setName('status').setDescription('Mostra os canais configurados'));

module.exports = {
  name: 'logs',
  data,
  run: async (_client, interaction) => {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild) && !interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) return interaction.reply({ content: '❌ Você precisa de Gerenciar Servidor.', ephemeral: true });
    const sub = interaction.options.getSubcommand();
    if (sub === 'canal') {
      const category = interaction.options.getString('categoria');
      const channel = interaction.options.getChannel('canal');
      setChannel(interaction.guild.id, GROUPS[category], channel.id);
      return interaction.reply({ content: `✅ Logs de **${category}** serão enviados em ${channel}.`, ephemeral: true });
    }
    if (sub === 'remover') {
      const category = interaction.options.getString('categoria');
      setChannel(interaction.guild.id, GROUPS[category], null);
      return interaction.reply({ content: `✅ O canal separado de **${category}** foi removido.`, ephemeral: true });
    }
    const current = status(interaction.guild.id);
    const lines = Object.entries(GROUPS).map(([label, key]) => {
      const id = current.channels?.[key];
      return `• **${label}**: ${id ? `<#${id}>` : current.channelId ? `<#${current.channelId}> (geral)` : 'não configurado'}`;
    });
    return interaction.reply({ content: `📋 **Canais de logs**\n${lines.join('\n')}`, ephemeral: true });
  }
};
