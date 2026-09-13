const { EmbedBuilder, ApplicationCommandType, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { produtos, configuracao } = require("../DataBaseJson");
const { ticketHome, logsHome } = require("../BotConfigPanels");
const startTime = Date.now();
const maxMemory = 100;
const usedMemory = process.memoryUsage().heapUsed / 1024 / 1024;
const memoryUsagePercentage = (usedMemory / maxMemory) * 100;
const roundedPercentage = Math.min(100, Math.round(memoryUsagePercentage));

async function Painel(interaction, client) {
  const embed = new EmbedBuilder()
    .setColor(`${configuracao.get(`Cores.Principal`) == null ? '0cd4cc' : configuracao.get('Cores.Principal')}`)
    .setTitle(`Configuracao do ${client.user.username}`)
    .setAuthor({ name: `${client.user.username}`, iconURL: client.user.displayAvatarURL({ dynamic: true }) })
    .setDescription(`Bom dia senhor(a) ${interaction.user}, o que deseja fazer?`)
    .addFields(
      { name: `**Versão do Bot**`, value: `3.0.1`, inline: true },
      { name: `**Ping**`, value: `\`${await client.ws.ping} MS\``, inline: true },
      { name: `**Uptime**`, value: `<t:${Math.ceil(startTime / 1000)}:R>`, inline: true },
    )
    .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL({ dynamic: true }) })
    .setTimestamp();

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("painelconfigvendas").setLabel('Sistema de Vendas').setEmoji(`1178064350066528266`).setStyle(1).setDisabled(false),
    new ButtonBuilder().setCustomId("painelconfigticket").setLabel('Sistema de Ticket').setEmoji(`1178064939651448973`).setStyle(1).setDisabled(false),
    new ButtonBuilder().setCustomId("painelconfigbv").setLabel('Sistema de boas vindas').setEmoji(`1178066050076643458`).setStyle(1).setDisabled(false),
  );

  const row3 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("painelpersonalizar").setLabel('Personalizar Bot').setEmoji(`1178066208835252266`).setStyle(1).setDisabled(false),
    new ButtonBuilder().setCustomId("rendimento").setLabel('Rendimento').setEmoji(`1178086986360307732`).setStyle(3).setDisabled(false),
    new ButtonBuilder().setCustomId("gerenciarconfigs").setLabel('Definições').setEmoji(`1178066377014255828`).setStyle(2).setDisabled(false),
  );

  const row4 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("botconfig_ticket_home").setLabel('Sistema de Ticket').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("botconfig_logs_home").setLabel('Sistema de Logs').setStyle(ButtonStyle.Secondary),
  );

  if (interaction.message == undefined) {
    return interaction.reply({ content: ``, components: [row2, row3, row4], embeds: [embed], ephemeral: true });
  }
  return interaction.update({ content: ``, components: [row2, row3, row4], embeds: [embed], ephemeral: true });
}

async function Gerenciar2(interaction, client) {
  const ggg = produtos.valueArray();
  const embed = new EmbedBuilder()
    .setColor(`${configuracao.get(`Cores.Principal`) == null ? '0cd4cc' : configuracao.get('Cores.Principal')}`)
    .setTitle(`Painel de Administração`)
    .setDescription(`Senhor(a) **${interaction.user.username}**, escolha o que deseja fazer.`)
    .addFields({ name: `**Total de produtos fornecidos**`, value: `${ggg.length}`, inline: true })
    .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL({ dynamic: true }) })
    .setTimestamp();
  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("criarrrr").setLabel('Criar').setEmoji(`1178067873894236311`).setStyle(1),
    new ButtonBuilder().setCustomId("gerenciarotemae").setLabel('Gerenciar').setEmoji(`1178067945855910078`).setStyle(1),
    new ButtonBuilder().setCustomId("gerenciarposicao").setLabel('Posições').setEmoji(`1178086608004722689`).setStyle(1),
  );
  const row3 = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("voltar00").setLabel('Voltar').setEmoji(`1178068047202893869`).setStyle(2));
  await interaction.update({ embeds: [embed], components: [row2, row3], content: `` });
}

module.exports = { Painel, Gerenciar2 };
