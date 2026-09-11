const { ApplicationCommandType, SlashCommandBuilder } = require('discord.js');
const { Painel } = require('../../Functions/Painel');
const { ticketHome, logsHome } = require('../../BotConfigPanels');
const { owner } = require('../../config.json');

const data = new SlashCommandBuilder()
  .setName('botconfig')
  .setDescription('Configura as funções do bot')
  .addSubcommand(s => s.setName('ticket').setDescription('Abre o painel de configuração de tickets'))
  .addSubcommand(s => s.setName('logs').setDescription('Abre o painel de configuração de logs'));

module.exports = {
  name: 'botconfig',
  description: 'Use para configurar minhas funções',
  type: ApplicationCommandType.ChatInput,
  data,
  run: async (client, interaction) => {
    if (interaction.user.id !== owner) return interaction.reply({ ephemeral: true, content: '❌ | Você não possui permissão para usar esse comando.' });
    const sub = interaction.options?.getSubcommand(false);
    if (sub === 'ticket') return ticketHome(interaction);
    if (sub === 'logs') return logsHome(interaction);
    return Painel(interaction, client);
  }
};
