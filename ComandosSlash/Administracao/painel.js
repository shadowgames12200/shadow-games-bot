const { ApplicationCommandType } = require('discord.js');
const { Painel } = require('../../Functions/Painel');
const { owner } = require('../../config.json');

module.exports = {
  name: 'botconfig',
  description: 'Use para configurar minhas funções',
  type: ApplicationCommandType.ChatInput,
  run: async (client, interaction) => {
    if (interaction.user.id !== owner) {
      return interaction.reply({ ephemeral: true, content: '❌ | Você não possui permissão para usar esse comando.' });
    }
    return Painel(interaction, client);
  },
};
