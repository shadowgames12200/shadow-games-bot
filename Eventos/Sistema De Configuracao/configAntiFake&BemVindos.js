const { ActionRowBuilder, TextInputBuilder, TextInputStyle, InteractionType, ModalBuilder } = require("discord.js");
const { configuracao } = require("../../DataBaseJson");

module.exports = {
    name: 'interactionCreate',

    run: async (interaction, client) => {

        if (interaction.isButton()) {
            if (interaction.customId === 'personalizarantifake') {
                const modalaAA = new ModalBuilder()
                    .setCustomId('joaozinhoAntiFake')
                    .setTitle(`Configurar anti fake`);

                const newnameboteN = new TextInputBuilder()
                    .setCustomId('tokenMP')
                    .setLabel(`QUANTIDADE DE DIAS MÍNIMA PARA ENTRAR`)
                    .setPlaceholder(`Digite "não" para desativar, serve para todos os campos.`)
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)

                const newnameboteN2 = new TextInputBuilder()
                    .setCustomId('tokenMP2')
                    .setLabel(`LISTA DE STATUS QUE DESEJA BLOQUEAR`)
                    .setPlaceholder(`Digite separado por vírgual os status das contas que deseja punir se detectadas.`)
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(true)
                    .setMaxLength(4000)

                const newnameboteN3 = new TextInputBuilder()
                    .setCustomId('tokenMP3')
                    .setLabel(`LISTA DE NOMES QUE DESEJA BLOQUEAR`)
                    .setPlaceholder(`Digite separado por vírgual os nomes das contas que deseja punir se detectadas.`)
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(true)
                    .setMaxLength(4000)

                const firstActionRow3 = new ActionRowBuilder().addComponents(newnameboteN);
                const firstActionRow4 = new ActionRowBuilder().addComponents(newnameboteN2);
                const firstActionRow5 = new ActionRowBuilder().addComponents(newnameboteN3);


                modalaAA.addComponents(firstActionRow3, firstActionRow4, firstActionRow5);
                await interaction.showModal(modalaAA);
            }
        }

        if (interaction.type == InteractionType.ModalSubmit) {

            if (interaction.customId === 'joaozinhoAntiFake') {
                const title = interaction.fields.getTextInputValue('tokenMP');
                const title2 = interaction.fields.getTextInputValue('tokenMP2');
                const title3 = interaction.fields.getTextInputValue('tokenMP3');


                if (title !== 'não') {
                    if (!isNaN(title)) {
                        configuracao.set(`AntiFake.diasminimos`, Number(title))
                    } else {
                        interaction.reply({ content: `❌ | Você colocou um numero incorreto nos dias!`, ephemeral: true })
                        return
                    }
                } else {
                    configuracao.set(`AntiFake.diasminimos`, 0)
                }


                if (title2 !== 'não') {

                    const stringSemEspacos = title2.replace(/\s/g, '');
                    const arrayDeBancos = stringSemEspacos.split(',');
                    configuracao.set(`AntiFake.status`, arrayDeBancos)
                }


                if (title3 !== 'não') {

                    const stringSemEspacos = title3.replace(/\s/g, '');
                    const arrayDeBancos = stringSemEspacos.split(',');
                    configuracao.set(`AntiFake.nomes`, arrayDeBancos)
                }


                interaction.reply({ content: `✅ | Todas configurações de Anti-Fake foram configuradas com sucesso!`, ephemeral: true })


            }

        }


    }
}