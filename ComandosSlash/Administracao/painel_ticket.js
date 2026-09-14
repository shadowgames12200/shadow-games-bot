const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { publicPanel, config } = require('../../LegacyTicketStaff');

const data = new SlashCommandBuilder()
  .setName('painel-ticket')
  .setDescription('Configura o painel público de atendimento')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild.bitfield)
  .addSubcommand(command => command
    .setName('enviar')
    .setDescription('Envia o painel público neste canal'))
  .addSubcommand(command => command
    .setName('status')
    .setDescription('Mostra a configuração atual do painel'));

module.exports = {
  name: 'painel-ticket',
  data,
  run: async (_client, interaction) => {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild) &&
        !interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: '❌ Você precisa de Gerenciar Servidor.', ephemeral: true });
    }

    if (interaction.options.getSubcommand() === 'status') {
      const current = config();
      return interaction.reply({
        content: `📋 **Painel:** ${current.title}\n**Descrição:** ${current.description}`,
        ephemeral: true
      });
    }

    return interaction.reply(publicPanel(interaction));
  }
};
