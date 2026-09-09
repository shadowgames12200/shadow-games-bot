const { PermissionsBitField, PermissionFlagsBits } = require('discord.js');
const { EmbedBuilder } = require('discord.js');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const Discord = require("discord.js");
const { owner } = require("../../config.json");

module.exports = {
  name: "unlock",
  description: "Destrancar Chat",
  type: Discord.ApplicationCommandType.ChatInput,
  defaultMemberPermissions: [PermissionFlagsBits.ManageChannels],
  run: async (client, interaction) => {

    if (interaction.user.id !== owner) { return interaction.reply({ ephemeral: true, content: `❌ | Você não possui permissão para usar esse comando.` }) }

    const lockButton = new ButtonBuilder()
      .setCustomId('Trancar1')
      .setLabel('Trancar')
      .setStyle(ButtonStyle.Primary);

    const buttonRow = new ActionRowBuilder().addComponents(lockButton);

    let unlockEmbed = new EmbedBuilder()
      .setDescription(`🔓 Este canal foi desbloqueado por ${interaction.user}.`)
      .setColor('#2b2d31');

    interaction.reply({ embeds: [unlockEmbed], components: [buttonRow] }).then(msg => {

      interaction.channel.permissionOverwrites.edit(interaction.guild.id, { SEND_MESSAGES: true })
        .catch(error => {
          console.error(error);
          interaction.reply({ content: 'Erro ao destrancar o canal. Verifique as permissões do bot.' });
        });
    });

    const collector = interaction.channel.createMessageComponentCollector();

    collector.on("collect", async (collectedInteraction) => {
      if (collectedInteraction.user.id !== interaction.user.id) {
        collectedInteraction.reply({ content: "**:x: Você não tem permissão para trancar esse canal.**", ephemeral: true });
      } else {
        await interaction.channel.permissionOverwrites.edit(interaction.guild.id, { SEND_MESSAGES: false });

        const lockEmbed = new EmbedBuilder()
          .setDescription(`🔒 Esse canal foi trancado por ${interaction.user}.`)
          .setColor('#2b2d31');

        collectedInteraction.update({ embeds: [lockEmbed], components: [] }); // Update message with new embed and remove buttons
      }
    });
  }
};
