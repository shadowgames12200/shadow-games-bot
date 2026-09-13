const { EmbedBuilder, ApplicationCommandType } = require("discord.js");


const { profileuser } = require("../../Functions/profile");

module.exports = {
  name: "perfil",
  description: "Use para configurar minhas funções",
  type: ApplicationCommandType.ChatInput,

  run: async (client, interaction, message) => {

    profileuser(interaction, userID = null)

  }
}