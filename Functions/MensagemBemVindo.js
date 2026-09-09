const { EmbedBuilder, ActionRowBuilder, ButtonBuilder } = require("discord.js");
const { configuracao } = require("../DataBaseJson");

function msgbemvindo(interaction, client) {
    const embed = new EmbedBuilder()
        .setColor(`${configuracao.get(`Cores.Principal`) == null ? "0cd4cc" : configuracao.get("Cores.Principal")}`)
        .setTitle("Configurar Boas vindas")
        .setDescription(
            `
**Mensagem**
${configuracao.get("Entradas.msg") == null ? "Não definido" : configuracao.get("Entradas.msg")}${
                configuracao.get(`Entradas.tempo`) == null || configuracao.get(`Entradas.tempo`) === 0
                    ? ""
                    : `\n**Tempo**\n\`${configuracao.get(`Entradas.tempo`)} segundos\``
            }`
        )
        .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL({ dynamic: true }) })
        .setTimestamp();

    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("editarmensagemboasvindas").setLabel("Editar").setEmoji(`1178079212700188692`).setStyle(1),

        new ButtonBuilder().setCustomId("voltar1").setLabel("Voltar").setEmoji(`1178068047202893869`).setStyle(2)
    );

    interaction.update({ components: [row2], embeds: [embed] });
}

module.exports = {
    msgbemvindo,
};
