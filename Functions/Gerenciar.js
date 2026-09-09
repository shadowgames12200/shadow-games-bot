const { EmbedBuilder, ApplicationCommandType, ActionRowBuilder, ButtonBuilder } = require("discord.js");

async function Gerenciar(interaction, client) {


    const row1 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId("configcargos")
                .setLabel('Cargos')
                .setEmoji(`1178086257784533092`)
                .setStyle(2),

            new ButtonBuilder()
                .setCustomId("personalizarcanais")
                .setLabel('Canais')
                .setEmoji(`1178086457169170454`)
                .setStyle(2),

        )

    const row2 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId("personalizarantifake")
                .setLabel('Anti-Fake')
                .setEmoji(`1178086608004722689`)
                .setStyle(2),

            new ButtonBuilder()
                .setCustomId("formasdepagamentos")
                .setLabel('Formas de pagamento')
                .setEmoji(`1178086986360307732`)
                .setStyle(1),

        )

    const row3 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId("voltar1")
                .setLabel('Voltar')
                .setEmoji(`1178068047202893869`)
                .setStyle(2)

        )


    if (interaction.message == undefined) {
        interaction.reply({ embeds: [], components: [row1, row2, row3], content: `O que precisa configurar?` })
    } else {
        interaction.update({ embeds: [], components: [row1, row2, row3], content: `O que precisa configurar?` })
    }

}



module.exports = {
    Gerenciar
}
