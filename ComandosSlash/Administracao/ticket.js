const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { publicPanel, staffPanel } = require('../../LegacyTicketStaff');

const data = new SlashCommandBuilder()
  .setName('ticket')
  .setDescription('Sistema de atendimento em threads privadas')
  .addSubcommand(command => command.setName('painel').setDescription('Publica o painel público de atendimento'))
  .addSubcommand(command => command.setName('staff').setDescription('Abre as ferramentas da equipe neste ticket'));

module.exports = {
  name: 'ticket',
  data,
  run: async (_client, interaction) => {
    const subcommand = interaction.options?.getSubcommand?.(false);
    if (subcommand === 'staff') return staffPanel(interaction);
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild) && !interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: '❌ Você precisa de Gerenciar Servidor para usar este subcomando.', ephemeral: true });
    }
    return interaction.reply(publicPanel(interaction));
  }
};
