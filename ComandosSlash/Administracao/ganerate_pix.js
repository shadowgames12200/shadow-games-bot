const Discord = require('discord.js');

module.exports = {
  name: 'gerarpagamento',
  description: 'Gere um pagamento via PIX.',
  type: Discord.ApplicationCommandType.ChatInput,
  run: async (client, interaction) => interaction.reply({
    content: '❌ Este comando legado foi desativado. Use os painéis de venda, que geram cobranças exclusivamente pelo Asaas.',
    ephemeral: true
  })
};
