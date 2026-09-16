
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, AttachmentBuilder } = require("discord.js")
const { produtos, carrinhos, pagamentos, configuracao } = require("../DataBaseJson")
const { QuickDB } = require("quick.db");
const mercadopago = require("mercadopago");
const db = new QuickDB();


async function DentroCarrinhoPix(interaction, client) {
    await interaction.deferUpdate()
    const tt = await interaction.message.edit({ content: `🔄 Aguarde...`, components: [] });



        const yy = await carrinhos.get(interaction.channel.id)

        const hhhh = produtos.get(`${yy.infos.produto}.Campos`)
        const gggaaa = hhhh.find(campo22 => campo22.Nome === yy.infos.campo)


        let valor = 0

        if (yy.cupomadicionado !== undefined) {
            const valor2 = gggaaa.valor * yy.quantidadeselecionada

            const hhhh2 = produtos.get(`${yy.infos.produto}.Cupom`)
            const gggaaaawdwadwa = hhhh2.find(campo22 => campo22.Nome === yy.cupomadicionado)
            valor = valor2 * (1 - gggaaaawdwadwa.desconto / 100);
        } else {
            valor = gggaaa.valor * yy.quantidadeselecionada
        }


        const aaaa = Number(valor).toFixed(2)

        var payment_data = {
            transaction_amount: Number(aaaa),
            description: `Pagamento - ${interaction.user.username}`,
            payment_method_id: 'pix',
            payer: { email: `${interaction.user.id}@users.invalid` }
        }
        mercadopago.configurations.setAccessToken(process.env.MP_ACCESS_TOKEN || configuracao.get('pagamentos.MpAPI'));
        await mercadopago.payment.create(payment_data)
            .then(async function (data) {



                const { qrGenerator } = require('../Lib/QRCodeLib')
                const qr = new qrGenerator({ imagePath: './Lib/aaaaa.png' })
                const qrcode = await qr.generate(data.body.point_of_interaction.transaction_data.qr_code)


                const buffer = Buffer.from(qrcode.response, "base64");
                const attachment = new AttachmentBuilder(buffer, { name: "payment.png" });

                const embed = new EmbedBuilder()
                    .setColor(`${configuracao.get(`Cores.Principal`) == null ? '2b2d31' : configuracao.get('Cores.Principal')}`)
                    .setAuthor({ name: interaction.user.username, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })

                    .setTitle(`Pagamento via PIX criado`)
                    .addFields(
                        { name: `Código copia e cola`, value: `\`\`\`${data.body.point_of_interaction.transaction_data.qr_code}\`\`\`` }
                    )
                    .setFooter(
                        { text: `${interaction.guild.name} - Pagamento expira em 10 minutos.` }
                    )
                    .setTimestamp()
                    .setImage(`https://cdn.discordapp.com/attachments/1179498681481830542/1179499043777429615/qr_code.png?ex=657a0116&is=65678c16&hm=83a7242c9f6a72f9128da76b14ede8ee1df01f5ba0ed0799f8c753b92fa8ede0&`)



                const row3 = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId("codigocopiaecola")
                            .setLabel('Código copia e cola')
                            .setStyle(2),

                    )



                embed.setImage('attachment://payment.png')

                carrinhos.set(`${interaction.channel.id}.pagamentos`, { id: data.body.id, cp: data.body.point_of_interaction.transaction_data.qr_code, method: 'pix' })
                pagamentos.set(`${interaction.channel.id}.pagamentos`, { id: data.body.id, cp: data.body.point_of_interaction.transaction_data.qr_code, method: 'pix', data: Date.now() })

                await tt.edit({ embeds: [embed], files: [attachment], content: ``, components: [row3] })

                await interaction.channel.setName(`💱・${yy.user.username}・${yy.user.id}`)


                const mandanopvdocara = new EmbedBuilder()
                    .setColor(`${configuracao.get(`Cores.Processamento`) == null ? `#fcba03` : configuracao.get(`Cores.Processamento`)}`)
                    .setAuthor({ name: `Pedido #${data.body.id}` })
                    .setTitle(`<:cloudshopping:1267516502513418324> Pedido solicitado`)
                    .setFooter(
                        { text: interaction.guild.name, iconURL: interaction.guild.iconURL({ dynamic: true }) }
                    )
                    .setTimestamp()
                    .setDescription(`Seu pedido foi criado e agora está aguardando a confirmação do pagamento`)
                    .addFields(
                        { name: `**Detalhes**`, value: `\`${yy.quantidadeselecionada}x ${yy.infos.produto} - ${yy.infos.campo} | R$ ${Number(valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\`` }
                    )

                try {
                    await interaction.user.send({ embeds: [mandanopvdocara] })
                } catch (error) {

                }



                const dsfjmsdfjnsdfj = new EmbedBuilder()
                    .setColor(`${configuracao.get(`Cores.Processamento`) == null ? `#fcba03` : configuracao.get(`Cores.Processamento`)}`)
                    .setAuthor({ name: `Pedido #${data.body.id}` })
                    .setTitle(`<:cloudshopping:1267516502513418324> Pedido solicitado`)
                    .setDescription(`Usuário ${interaction.user} solicitou um pedido`)
                    .addFields(
                        { name: `**Detalhes**`, value: `\`${yy.quantidadeselecionada}x ${yy.infos.produto} - ${yy.infos.campo} | R$ ${Number(valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\`` },
                        { name: `**Forma de pagamento**`, value: `Pix` }
                    )
                    .setFooter(
                        { text: interaction.guild.name, iconURL: interaction.guild.iconURL({ dynamic: true }) }
                    )
                    .setTimestamp()





                try {
                    const channela = await client.channels.fetch(configuracao.get(`ConfigChannels.logpedidos`));
                    await channela.send({ embeds: [dsfjmsdfjnsdfj] }).then(yyyyy => {
                        carrinhos.set(`${interaction.channel.id}.replys`, { channelid: yyyyy.channel.id, idmsg: yyyyy.id })
                    })
                } catch (error) {

                }




            })
            .catch(function (error) {
                const row3 = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId("pagarpix")
                            .setLabel('Pix')
                            .setStyle(3),

                        new ButtonBuilder()
                            .setCustomId("pagarcrypto")
                            .setLabel('Crypto')
                            .setStyle(1)
                            .setDisabled(true),

                        new ButtonBuilder()
                            .setCustomId("voltarcarrinho")
                            .setLabel(' Voltar')
                            .setStyle(2)
                    )

                tt.edit({ content: `Selecione uma forma de pagamento.`, ephemeral: true, components: [row3] })
                interaction.followUp({ content: `❌ | Ocorreu um erro ao criar o pagamento, tente novamente.\nError: ${error}`, ephemeral: true })
            })

}

async function DentroCarrinho2(interaction) {

    const yd = carrinhos.get(interaction.channel.id)

    const hhhh = produtos.get(`${yd.infos.produto}.Campos`)
    const gggaaa = hhhh.find(campo22 => campo22.Nome === yd.infos.campo)


    if (yd.quantidadeselecionada > gggaaa.condicao?.valormaximo) return interaction.reply({ content: `❌ | Você não pode comprar mais de \`${gggaaa.condicao.valormaximo}x ${yd.infos.produto} - ${yd.infos.campo}\``, ephemeral: true })
    if (yd.quantidadeselecionada < gggaaa.condicao?.valorminimo) return interaction.reply({ content: `❌ | Você não pode comprar mais de \`${gggaaa.condicao.valorminimo}x ${yd.infos.produto} - ${yd.infos.campo}\``, ephemeral: true })
    await interaction.deferUpdate()

    // content: `Selecione uma forma de pagamento.`


    const row3 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId("pagarpix")
                .setLabel('<:ea12:1270352455795867741> Pix')
                .setStyle(3),

            new ButtonBuilder()
                .setCustomId("pagarcrypto")
                .setLabel('<:emoji_49:1270355096143790231> Crypto')
                .setStyle(1)
                .setDisabled(true),

            new ButtonBuilder()
                .setCustomId("voltarcarrinho")
                .setLabel('<:emoji_48:1270355023741714492> Voltar')
                .setStyle(2)
        )

    await interaction.message.edit({ content: `Selecione uma forma de pagamento.`, components: [row3], embeds: [] })
}

async function DentroCarrinho1(thread, status) {

    let ggg
    if (status == 1) {
        ggg = carrinhos.get(thread.channel.id)
    } else {
        ggg = carrinhos.get(thread.id)
    }



    const hhhh = produtos.get(`${ggg.infos.produto}.Campos`)
    const gggaaa = hhhh.find(campo22 => campo22.Nome === ggg.infos.campo)
    let yy = await carrinhos.get(`${ggg.threadid}.quantidadeselecionada`)
    if (yy == null) {
        await carrinhos.set(`${ggg.threadid}.quantidadeselecionada`, 1)
        yy = 1
    }


    const embed = new EmbedBuilder()
        .setColor(`${configuracao.get(`Cores.Principal`) == null ? '0cd4cc' : configuracao.get('Cores.Principal')}`)
        .setAuthor({ name: ggg.user.username, iconURL: ggg.user.displayAvatarURL })
        .setTitle(`Finalizando carrinho`)

        .setFooter(
            { text: ggg.guild.name }
        )
        .setTimestamp()


    const hhhhsdsadasd2 = produtos.get(`${ggg.infos.produto}.Config`)

    if (hhhhsdsadasd2.banner !== undefined || hhhhsdsadasd2.banner !== '') {
        try {
            await embed.setImage(`${hhhhsdsadasd2.banner}`)
        } catch (error) {

        }

    }
    if (hhhhsdsadasd2.icon !== undefined || hhhhsdsadasd2.icon !== '') {
        try {
            await embed.setThumbnail(`${hhhhsdsadasd2.icon}`)
        } catch (error) {

        }

    }



    if (ggg.cupomadicionado !== undefined) {


        const ggg2 = carrinhos.get(thread.channel.id)
        const hhhh2 = produtos.get(`${ggg.infos.produto}.Cupom`)
        const gggaaaawdwadwa = hhhh2.find(campo22 => campo22.Nome === ggg2.cupomadicionado)

        const yyfyfy = gggaaa.valor * yy

        const valorComDesconto = yyfyfy * (1 - gggaaaawdwadwa.desconto / 100);

        const valorOriginalFormatado = Number(yyfyfy).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const valorComDescontoFormatado = Number(valorComDesconto).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });


        embed.addFields(
            { name: `**Carrinho**`, value: `\`${yy}x ${ggg.infos.produto} - ${ggg.infos.campo}\``, inline: true },
            {
                name: `**Valor à vista**`,
                value: `De ~~\`R$ ${valorOriginalFormatado}\`~~  por \`${valorComDescontoFormatado}\``,
                inline: true
            },
            { name: `**Cupom**`, value: `\`${ggg2.cupomadicionado}\``, inline: false },
            { name: `**Em estoque**`, value: `\`${gggaaa.estoque.length}\``, inline: false }
        )

    } else {

        embed.addFields(
            { name: `**Carrinho**`, value: `\`${yy}x ${ggg.infos.produto} - ${ggg.infos.campo}\``, inline: true },
            { name: `**Valor à vista**`, value: `\`R$ ${Number(gggaaa.valor * yy).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\``, inline: true },
            { name: `**Em estoque**`, value: `\`${gggaaa.estoque.length}\``, inline: false }
        )

    }

    const row2 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId("irparapagamento")
                .setLabel('Ir para pagamento')
                .setStyle(3),

            new ButtonBuilder()
                .setCustomId("editarquantidade")
                .setLabel('Editar quantidade')
                .setStyle(1),

            new ButtonBuilder()
                .setCustomId("usarcupom")
                .setLabel('Usar cupom')
                .setStyle(2),

            new ButtonBuilder()
                .setCustomId("deletchannel")
                .setLabel('Cancelar')
                .setStyle(4)
        )

    if (status == 1) {
        await thread.deferUpdate()
        await thread.message.edit({ content: `<@${ggg.user.id}>`, embeds: [embed], components: [row2] })

    } else {
        await thread.send({ content: `<@${ggg.user.id}>`, embeds: [embed], components: [row2] })
    }

}

module.exports = {
    DentroCarrinho1,
    DentroCarrinho2,
    DentroCarrinhoPix
}
