const { EmbedBuilder, ApplicationCommandType, ActionRowBuilder, ButtonBuilder } = require("discord.js");
const startTime = Date.now();
const maxMemory = 100;
const usedMemory = process.memoryUsage().heapUsed / 1024 / 1024;
const memoryUsagePercentage = (usedMemory / maxMemory) * 100;
const roundedPercentage = Math.min(100, Math.round(memoryUsagePercentage));
const { Painel } = require("../../Functions/Painel");
const { pedidos, pagamentos, carrinhos, configuracao, produtos } = require("../../DataBaseJson");
const { EstatisticasNode } = require("../../index.js");

module.exports = {
  name: "rank",
  description: "Use para ver a classificação de gastos do servidor",
  type: ApplicationCommandType.ChatInput,

  run: async (client, interaction, message) => {

    const rank = await EstatisticasNode.Ranking(10000, 'valorTotal');

    if (rank.length === 0) {
      return interaction.reply({ content: `❌ Não há dados suficientes para gerar um ranking.`, ephemeral: true });
    }

    const pageSize = 10;
    const totalPages = Math.ceil(rank.length / pageSize);

    let page = 1;

    const updateMessage = async () => {
      const startIdx = (page - 1) * pageSize;
      const endIdx = startIdx + pageSize;

      const currentPage = rank.slice(startIdx, endIdx);

      let msg = ``;

      for (let index = 0; index < currentPage.length; index++) {
        const element = currentPage[index];
        msg += `**${startIdx + index + 1}.** <@!${element.userID}>, total de \`R$ ${Number(element.valorTotal).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\` gastos e \`${element.qtdCompraTotal}\` pedido(s).\n`;
      }

      const embed = new EmbedBuilder()
        .setColor(`${configuracao.get(`Cores.Processamento`) == null ? `#fcba03` : configuracao.get(`Cores.Processamento`)}`)
        .setTitle(`Ranking de gastos`)
        .setDescription(msg)
        .setFooter(
          { text: interaction.guild.name, iconURL: interaction.guild.iconURL({ dynamic: true }) }
        )
        .setTimestamp();

      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('previous')
            .setEmoji(`1191798275616018432`)
            .setStyle(2),
          new ButtonBuilder()
            .setCustomId('info')
            .setLabel(`${page} de ${totalPages}`)
            .setStyle(2)
            .setDisabled(true),
          new ButtonBuilder()
            .setCustomId('next')
            .setEmoji(`1191798327596032102`)
            .setStyle(2)
        );
      try {
        await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
      } catch (error) {
        await interaction.editReply({ embeds: [embed], components: [row], ephemeral: true });
      }

    };

    await updateMessage();

    const filter = i => {
      i.deferUpdate();
      return i.customId === 'previous' || i.customId === 'next';
    };

    const collector = interaction.channel.createMessageComponentCollector({ filter, time: 120000 });

    collector.on('collect', async i => {
      if (i.customId === 'previous' && page > 1) {
        page--;
        await updateMessage();
      } else if (i.customId === 'next' && page < totalPages) {
        page++;
        await updateMessage();
      }
    });

    collector.on('end', collected => {
      if (collected.size === 0) {
        
        interaction.editReply({ components: [], embeds: [], content: `😥 | Seu tempo expirou utilize /rank novamente!` });
      }
    });


  }
}
