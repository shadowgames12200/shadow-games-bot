const { EmbedBuilder, ApplicationCommandType, ActionRowBuilder, ButtonBuilder, PermissionFlagsBits } = require("discord.js");
const startTime = Date.now();
const maxMemory = 100;
const usedMemory = process.memoryUsage().heapUsed / 1024 / 1024;
const memoryUsagePercentage = (usedMemory / maxMemory) * 100;
const roundedPercentage = Math.min(100, Math.round(memoryUsagePercentage));
const { Painel } = require("../../Functions/Painel");
const { getPermissions } = require("../../Functions/PermissionsCache.js");
const { owner } = require("../../config.json");

module.exports = {
  name: "botconfig",
  description: "Use para configurar minhas funções",
  type: ApplicationCommandType.ChatInput,

  run: async (client, interaction, message) => {
    const isOwner = interaction.user.id === owner;
    const isAdmin = interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild) || interaction.memberPermissions?.has(PermissionFlagsBits.Administrator);
    if (!isOwner && !isAdmin) { return interaction.reply({ ephemeral: true, content: `❌ | Você precisa de Administrador ou Gerenciar Servidor para usar este comando.` })}

    Painel(interaction, client)
  }
}
