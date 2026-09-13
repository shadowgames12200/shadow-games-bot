const Discord = require("discord.js");
const { profileuser } = require("../../Functions/profile");

module.exports = {
  name: "👤 User Profile",
  type: Discord.ApplicationCommandType.Message,



  run: async (client, interaction) => {

    const message = await interaction.channel.messages.fetch(interaction.targetId);
   
    profileuser(interaction, message.author.id)
  }
}