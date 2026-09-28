const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { EVENTS, setChannel, status } = require('../../LogSuite');

const choices = Object.entries(EVENTS).map(([value, name]) => ({ name, value }));
const data = new SlashCommandBuilder()
 .setName('logs')
 .setDescription('Consulta as configurações de logs; configure os canais pelo /botconfig')
 .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild.bitfield)
 .addSubcommand(sub => sub.setName('remover').setDescription('Remove a configuração de um evento')
   .addStringOption(option => option.setName('evento').setDescription('Evento').setRequired(true).addChoices(...choices)))
 .addSubcommand(sub => sub.setName('status').setDescription('Mostra todos os eventos configurados'));

module.exports = {
 name: 'logs',
 data,
 run: async (_client, interaction) => {
   if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild) && !interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) return interaction.reply({ content: '❌ Você precisa de Gerenciar Servidor.', ephemeral: true });
   const sub = interaction.options.getSubcommand();
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
