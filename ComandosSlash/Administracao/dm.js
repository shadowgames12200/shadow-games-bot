const Discord = require("discord.js");
const { MessageEmbed, PermissionFlagsBits, MessageActionRow, ButtonBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { owner } = require("../../config.json");

module.exports = {
  name: "dm",
  description: 'Envie uma mensagem no privado de um usuário.',
  type: Discord.ApplicationCommandType.ChatInput,
  options: [
    {
      name: 'usuário',
      description: 'Mencione um usuário.',
      type: Discord.ApplicationCommandOptionType.User,
      required: true
    },
    {
      name: 'mensagem',
      description: 'Envie algo para ser enviado.',
      type: Discord.ApplicationCommandOptionType.String,
      required: true
    }
  ],

  run: async (client, interaction) => {

    if (interaction.user.id !== owner) { return interaction.reply({ ephemeral: true, content: `❌ | Você não possui permissão para usar esse comando.` }) }

    const member = interaction.options.getUser('usuário');
    const msg = interaction.options.getString('mensagem');

    const channelID = "1250189264130408529"; 

    try {
      const channel = await client.channels.fetch(channelID);

      const logEmbed = new Discord.EmbedBuilder()
        .setColor('#2b2d31')
        .setTitle('Mensagem Enviada')
        .setDescription('Uma mensagem foi enviada usando o comando `/dm`')
        .addFields(
          { name: 'Quem Enviou', value: interaction.user.toString(), inline: true },
          { name: 'Quem Recebeu', value: member.toString(), inline: true },
          { name: 'Mensagem', value: `\`${msg}\`` }
        );

      channel.send({ embeds: [logEmbed] });
    } catch (error) {
      console.error(error);
    }

    try {
  await member.send({ content: `\'${msg}\n\`` });
      return interaction.reply({
        content: `✅ | Mensagem enviada com sucesso para ${member} no privado (DM).`,
        embeds: [], 
        ephemeral: true 
      });
    } catch (error) {
      return interaction.reply({
        content: `❌ | A mensagem não foi enviada para ${member}, pois o usuário está com a DM fechada!`,
        embeds: [], 
        ephemeral: true 
      });
    }
  }
};
