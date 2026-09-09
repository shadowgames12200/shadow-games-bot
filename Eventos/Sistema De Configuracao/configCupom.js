
const Discord = require("discord.js")
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require("discord.js")
const { produtos } = require("../../DataBaseJson");
const { QuickDB } = require("quick.db");
const { GerenciarCampos, GerenciarCampos2 } = require("../../Functions/GerenciarCampos");
const { MessageCreate, UpdateMessageProduto } = require("../../Functions/SenderMessagesOrUpdates");
const { GerenciarCupom } = require("../../Functions/GerenciarCupom");

const db = new QuickDB();


module.exports = {
    name: 'interactionCreate',

    run: async (interaction, client) => {



        if (interaction.type == Discord.InteractionType.ModalSubmit) {
            if (interaction.customId === 'awdwadpiawjdboawidbae8h6fafah8f') {

                const ggg = await db.get(interaction.message.id)
                let name = interaction.fields.getTextInputValue('tokenMP');
                let qtd = interaction.fields.getTextInputValue('tokenMP2');
                let dias = interaction.fields.getTextInputValue('tokenMP3');

                if (Number.isInteger(qtd)) return interaction.reply({ content: `❌ O número de desconto inserio é inválido \`${qtd}\``, ephemeral: true })
                if (dias !== '') {
                    if (Number.isInteger(dias)) return interaction.reply({ content: `❌ O número de dias inserio é inválido \`${dias}\``, ephemeral: true })


                }
                const produtoExistente = produtos
                    .filter(produto => produto.data.Cupom)
                    .some(produto => produto.data.Cupom.some(campo => campo.Nome === name));

                if (produtoExistente) return interaction.reply({ ephemeral: true, content: `❌ Nome do cupom já existente.` })

                if (dias !== '') {
                    const dataAtual = new Date();
                    const dataFinal = new Date(dataAtual);
                    dataFinal.setDate(dataAtual.getDate() + dias);


                    produtos.push(`${ggg.name}.Cupom`, {
                        usos: 0,
                        desconto: Number(qtd),
                        Nome: name,
                        diasvalidos: dataFinal.getTime(),
                        diasvalidos2: dias,
                        criado: Date.now()
                    })
                } else {
                    produtos.push(`${ggg.name}.Cupom`, {
                        usos: 0,
                        desconto: Number(qtd),
                        Nome: name,
                        criado: Date.now()
                    })
                }


                await GerenciarCupom(interaction, ggg.name)


                const row3 = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId("configavccupomm")
                            .setLabel('Opções avançadas')
                            .setStyle(2),
                    )

                interaction.followUp({ components: [row3], content: `✅ Cupom criado.`, ephemeral: true }).then(async msgg => {
                    await db.set(`${interaction.user.id}.editephemeral`, { cupom: name, produto: ggg.name, webhookID: interaction.token, applicationid: interaction.applicationId, msgid: interaction.message.id })



                })






            }

            if (interaction.customId === 'doinabuydoboudwoaynidnioawdawdiaw') {

                const ggg = await db.get(`${interaction.user.id}.editephemeral`)
                let maxuse = interaction.fields.getTextInputValue('tokenMP');
                let qtdcupom = interaction.fields.getTextInputValue('tokenMP2');
                let cargospodeusar = interaction.fields.getTextInputValue('tokenMP3');
                let precominimo = interaction.fields.getTextInputValue('tokenMP4');
                let qtdmaxima = interaction.fields.getTextInputValue('tokenMP5');


                const hhhh = produtos.get(`${ggg.produto}.Cupom`)
                const gggaaa = hhhh.find(campo22 => campo22.Nome === ggg.cupom)

                if (qtdcupom !== '' && !isNaN(qtdcupom)) {
                    gggaaa.qtd = Number(qtdcupom);
                }

                if (maxuse !== '' && !isNaN(maxuse)) {
                    gggaaa.maxuse = Number(maxuse);
                }

                if (precominimo !== '' || qtdmaxima !== '' || cargospodeusar !== '') {
                    gggaaa.condicoes = {};
                }

                if (precominimo !== '' && !isNaN(precominimo)) {
                    gggaaa.condicoes.precominimo = Number(precominimo);
                }

                if (qtdmaxima !== '' && !isNaN(qtdmaxima)) {
                    gggaaa.condicoes.qtdmaxima = Number(qtdmaxima);
                }

                if (cargospodeusar !== '') {
                    const ddd = await interaction.guild.roles.fetch(cargospodeusar)
                    if (ddd == null) return interaction.reply({ ephemeral: true, content: `❌ Cargo inserido \`${cargospodeusar}\` inválido.` })
                    gggaaa.condicoes.cargospodeusar = cargospodeusar;
                }



                await produtos.set(`${ggg.produto}.Cupom`, hhhh)

                try {
                    GerenciarCupom(interaction, ggg.produto, ggg)
                } catch (error) {
                }

                interaction.update({ content: `✅ Alterações bem sucedida` })


            }


            if (interaction.customId === 'wdawdwdawdwadawdwdwwdaw') {
                let confirm = interaction.fields.getTextInputValue('tokenMP');
                if (confirm !== 'sim') return interaction.reply({ content: `❌ Confirmação não validada.`, ephemeral: true })

                const ggg22 = await db.get(`${interaction.message.id}.delcupons`)
                const ggg = await db.get(`${interaction.message.id}`)
                for (const iterator of ggg22) {

                    produtos.pull(`${ggg.name}.Cupom`, (element, index, array) => element.Nome == iterator);
                }

                GerenciarCupom(interaction, ggg.name)

            }


        }

        if (interaction.isSelectMenu()) {
            if (interaction.customId == 'deletarcupom') {

                const ggg2 = await db.get(interaction.message.id)
                if (interaction.values.length == 0) {
                    GerenciarCupom(interaction, ggg2.name)
                    return
                }

                const modalaAA = new ModalBuilder()
                    .setCustomId('wdawdwdawdwadawdwdwwdaw')
                    .setTitle(`Remover cupons`);

                const newnameboteN = new TextInputBuilder()
                    .setCustomId('tokenMP')
                    .setLabel(`Confirmação`)
                    .setPlaceholder(`Digite "sim" para apagar ${interaction.values.length} cupons`)
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)

                const firstActionRow5 = new ActionRowBuilder().addComponents(newnameboteN);



                modalaAA.addComponents(firstActionRow5);
                await interaction.showModal(modalaAA);


                await db.set(`${interaction.message.id}.delcupons`, interaction.values)
            }
        }


        if (interaction.isButton()) {


            if (interaction.customId == 'remcupom') {
                const selectMenuBuilder = new Discord.StringSelectMenuBuilder()
                    .setCustomId('deletarcupom')
                    .setPlaceholder('Clique aqui para selecionar')
                    .setMinValues(0)

                const ggg2 = await db.get(interaction.message.id)
                const ggg = produtos.get(`${ggg2.name}.Cupom`)

                if (ggg == 0) {
                    interaction.reply({ ephemeral: true, content: `❌ Esse produto ainda não possuí nenhum cupom.` })
                    return
                }

                const ggg22 = produtos.get(`${ggg2.name}`)

                for (const gggg of ggg) {

                    const option = {
                        label: `${gggg.Nome}`,
                        value: gggg.Nome
                    };

                    selectMenuBuilder.addOptions(option);
                }

                selectMenuBuilder.setMaxValues(selectMenuBuilder.options.length)
                const style2row = new ActionRowBuilder().addComponents(selectMenuBuilder);

                try {


                    await interaction.update({ components: [style2row], content: `❓ Quais cupons de \`${ggg22.Config.name}\` deseja remover?`, embeds: [] })
                } catch (error) {
                }
            }

            if (interaction.customId == 'configavccupomm') {



                const modalaAA = new ModalBuilder()
                    .setCustomId('doinabuydoboudwoaynidnioawdawdiaw')
                    .setTitle(`Criar cupom etapa 2 (Opcional)`);

                const newnameboteN = new TextInputBuilder()
                    .setCustomId('tokenMP')
                    .setLabel(`MÁXIMO DE USOS (POR PESSOA)`)
                    .setPlaceholder(`Insira uma quantidade limite de uso`)
                    .setStyle(TextInputStyle.Short)
                    .setRequired(false)

                const newnameboteN2 = new TextInputBuilder()
                    .setCustomId('tokenMP2')
                    .setLabel(`QUANTIDADE DE CUPONS`)
                    .setPlaceholder(`Insira uma quantidade limite de cupons`)
                    .setStyle(TextInputStyle.Short)
                    .setRequired(false)

                const newnameboteN3 = new TextInputBuilder()
                    .setCustomId('tokenMP3')
                    .setLabel(`ID DO CARGO (SE QUISER QUE POSSUA PARA USAR)`)
                    .setPlaceholder(`Insira um id de algum cargo desejado`)
                    .setStyle(TextInputStyle.Short)
                    .setRequired(false)


                const newnameboteN4 = new TextInputBuilder()
                    .setCustomId('tokenMP4')
                    .setLabel(`QUANTIDADE MÍNIMA (SE QUISER UM LIMITE)  `)
                    .setPlaceholder(`Insira a quantia mínina de compra`)
                    .setStyle(TextInputStyle.Short)
                    .setRequired(false)

                const newnameboteN5 = new TextInputBuilder()
                    .setCustomId('tokenMP5')
                    .setLabel(`QUANTIDADE MÁXIMA (SE QUISER UM LIMITE)`)
                    .setPlaceholder(`Insira a quantia máxima de compra`)
                    .setStyle(TextInputStyle.Short)
                    .setRequired(false)


                const firstActionRow3 = new ActionRowBuilder().addComponents(newnameboteN);
                const firstActionRow4 = new ActionRowBuilder().addComponents(newnameboteN2);
                const firstActionRow5 = new ActionRowBuilder().addComponents(newnameboteN3);
                const firstActionRow6 = new ActionRowBuilder().addComponents(newnameboteN4);
                const firstActionRow7 = new ActionRowBuilder().addComponents(newnameboteN5);





                modalaAA.addComponents(firstActionRow3, firstActionRow4, firstActionRow5, firstActionRow6, firstActionRow7);
                await interaction.showModal(modalaAA);
            }



            if (interaction.customId == 'gencupons') {

                const ggg = await db.get(interaction.message.id)

                GerenciarCupom(interaction, ggg.name)


            }




            if (interaction.customId == 'addcupom') {
                const modalaAA = new ModalBuilder()
                    .setCustomId('awdwadpiawjdboawidbae8h6fafah8f')
                    .setTitle(`Criar cupom`);

                const newnameboteN = new TextInputBuilder()
                    .setCustomId('tokenMP')
                    .setLabel(`CÓDIGO`)
                    .setPlaceholder(`Inisira um nome para esse cupom`)
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)

                const newnameboteN2 = new TextInputBuilder()
                    .setCustomId('tokenMP2')
                    .setLabel(`DESCONTO`)
                    .setPlaceholder(`Insira um desconto, exemplo para 10%: 10`)
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)

                const newnameboteN4 = new TextInputBuilder()
                    .setCustomId('tokenMP3')
                    .setLabel(`VALIDADE`)
                    .setPlaceholder(`Insira a quantidade de dias que esse cupom vai valer`)
                    .setStyle(TextInputStyle.Short)
                    .setRequired(false)




                const firstActionRow3 = new ActionRowBuilder().addComponents(newnameboteN);
                const firstActionRow4 = new ActionRowBuilder().addComponents(newnameboteN2);
                const firstActionRow5 = new ActionRowBuilder().addComponents(newnameboteN4);





                modalaAA.addComponents(firstActionRow3, firstActionRow4, firstActionRow5);
                await interaction.showModal(modalaAA);


            }
        }


    }
}