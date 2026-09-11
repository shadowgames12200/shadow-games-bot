const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { EVENTS, setChannel, status } = require('../../LogSuite');

const choices = Object.entries(EVENTS).map(([value, name]) => ({ name, value }));
const data = new SlashCommandBuilder()
 .setName('logs')
 .setDescription('Configura um canal separado para cada evento')
 .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild.bitfield)
 .addSubcommand(sub => sub.setName('canal').setDescription('Define o canal de um evento')
   .addStringOption(option => option.setName('evento').setDescription('Evento que será registrado').setRequired(true).addChoices(...choices))
   .addChannelOption(option => option.setName('canal').setDescription('Canal de destino').setRequired(true).addChannelTypes(ChannelType.GuildText)))
 .addSubcommand(sub => sub.setName('remover').setDescription('Remove a configuração de um evento')
   .addStringOption(option => option.setName('evento').setDescription('Evento').setRequired(true).addChoices(...choices)))
 .addSubcommand(sub => sub.setName('status').setDescription('Mostra todos os eventos configurados'));

module.exports = {
 name: 'logs',
 data,
 run: async (_client, interaction) => {
   if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild) && !interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) return interaction.reply({ content: '❌ Você precisa de Gerenciar Servidor.', ephemeral: true });
   const sub = interaction.options.getSubcommand();
   if (sub === 'canal') {
     const event = interaction.options.getString('evento');
     const channel = interaction.options.getChannel('canal');
     setChannel(interaction.guild.id, event, channel.id);
     return interaction.reply({ content: `✅ **${EVENTS[event]}** será registrado em ${channel}.`, ephemeral: true });
   }
   if (sub === 'remover') {
     const event = interaction.options.getString('evento');
     setChannel(interaction.guild.id, event, null);
     return interaction.reply({ content: `✅ A configuração de **${EVENTS[event]}** foi removida.`, ephemeral: true });
   }
   const current = status(interaction.guild.id);
   const lines = Object.entries(EVENTS).map(([key, name]) => `• **${name}**: ${current.channels?.[key] ? `<#${current.channels[key]}>` : current.channelId ? `<#${current.channelId}> (geral)` : 'não configurado'}`);
   return interaction.reply({ content: `📋 **Logs por evento**\n${lines.join('\n')}`, ephemeral: true });
 }
};
