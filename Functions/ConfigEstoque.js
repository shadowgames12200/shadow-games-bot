const { ActionRowBuilder, ButtonBuilder } = require("discord.js")
const { QuickDB } = require("quick.db");
const db = new QuickDB();

function MessageStock(interaction, stat, prod, camp, update, reply) {

    const row2 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId("addestoque1")
                .setLabel('Adicionar')
                .setEmoji(`1178076508150059019`)
                .setStyle(3),

            new ButtonBuilder()
                .setCustomId("estoquearquivo")
                .setLabel('Enviar arquivo')
                .setEmoji(`1178347788501794836`)
                .setStyle(1),

            new ButtonBuilder()
                .setCustomId("estoquefantasma")
                .setLabel('Adicionar estoque fantasma')
                .setEmoji(`1178347870747906131`)
                .setDisabled(false)
                .setStyle(2)
        )

    const row3 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId("Voltar10")
                .setLabel('Voltar')
                .setEmoji(`1178068047202893869`)
                .setStyle(2)

        )

    if (stat == 1) {
        if (update !== true) {
            interaction.reply({ embeds: [], content: `Selecione o método`, components: [row2, row3], ephemeral: true, fetchReply: true }).then(async msg => {
                const message = await interaction.fetchReply();
                db.set(message.id, { name: prod, camposelect: camp })
            })
        } else {

            if (reply !== true) {
                interaction.update({ embeds: [], content: `Selecione o método`, components: [row2, row3], ephemeral: true, fetchReply: true }).then(async msg => {
                    db.set(interaction.message.id, { name: prod, camposelect: camp })
                })
            }else{
                interaction.reply({ embeds: [], content: `Selecione o método`, components: [row2, row3], ephemeral: true, fetchReply: true }).then(async msg => {
                    const message = await interaction.fetchReply();
                    db.set(message.id, { name: prod, camposelect: camp })
                })
            }
        }
    } else {
        interaction.update({ embeds: [], content: `Selecione o método`, components: [row2, row3] })
    }



}

module.exports = {
    MessageStock
}