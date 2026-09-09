const { EmbedBuilder, ApplicationCommandType, ActionRowBuilder, ButtonBuilder } = require("discord.js");
const Discord = require('discord.js');
const { profileuser } = require("../../Functions/profile");


module.exports = {
  name: "profile",
  description: "Vejá seu perfil",
  type: ApplicationCommandType.ChatInput,
  options: [
    {
      name: "user",
      description: "Selecione o usuário abaixo:",
      type: Discord.ApplicationCommandOptionType.User,
      required: false,
    },
  ],

  run: async (client, interaction, message) => {

    profileuser(interaction, interaction.options.getUser('user')?.id)
  }
}
