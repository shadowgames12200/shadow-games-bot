const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { panel, adminPanel } = require('../../TicketControlSuiteEnhanced');
const { staffPanel } = require('../../TicketStaffPanel');

const data = new SlashCommandBuilder()
  .setName('ticket')
  .setDescription('Sistema único de suporte, dúvidas, compras e atendimento')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild.toString())
  .addSubcommand(command => command
    .setName('painel')
    .setDescription('Publica o painel público de atendimento'))
  .addSubcommand(command => command
    .setName('configurar')
    .setDescription('Abre o painel administrativo de tickets'))
  .addSubcommand(command => command
    .setName('staff')
    .setDescription('Abre as ferramentas da equipe neste ticket'));

module.exports = {
  name: 'ticket',
  data,
  run: async (_client, interaction) => {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild) && !interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: '❌ Você precisa de Gerenciar Servidor para usar este comando.', ephemeral: true });
    }
    const subcommand = interaction.options?.getSubcommand?.(false);
    if (subcommand === 'configurar') return interaction.reply(adminPanel());
    if (subcommand === 'staff') return staffPanel(interaction);
    return interaction.reply(panel());
  }
};
