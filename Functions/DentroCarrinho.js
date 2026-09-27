
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, AttachmentBuilder } = require("discord.js")
const { produtos, carrinhos, pagamentos, configuracao } = require("../DataBaseJson")
const { QuickDB } = require("quick.db");
const paymentProviders = require('../PaymentProviders');
const QRCode = require('qrcode');
const db = new QuickDB();
const paymentCreationInProgress = new Set();


async function DentroCarrinhoPix(interaction, client) {
    await interaction.deferUpdate()
    const channelId = String(interaction.channel.id);
    if (paymentCreationInProgress.has(channelId) || pagamentos.has(channelId) || pagamentos.has(`${channelId}.pagamentos`)) {
        return interaction.followUp({ content: 'Já existe um pagamento pendente neste pedido. Aguarde a confirmação ou a expiração antes de tentar novamente.', ephemeral: true }).catch(() => {});
    }
    paymentCreationInProgress.add(channelId);
    let tt = interaction.message;

    try {
        tt = await interaction.message.edit({ content: `🔄 Aguarde...`, components: [] });
        const yy = await carrinhos.get(interaction.channel.id)
        const hhhh = produtos.get(`${yy.infos.produto}.Campos`)
        const gggaaa = hhhh.find(campo22 => campo22.Nome === yy.infos.campo)
        let valor = yy.cupomadicionado !== undefined
            ? gggaaa.valor * yy.quantidadeselecionada
            : gggaaa.valor * yy.quantidadeselecionada

        if (yy.cupomadicionado !== undefined) {
            const hhhh2 = produtos.get(`${yy.infos.produto}.Cupom`)
            const cupom = hhhh2.find(campo22 => campo22.Nome === yy.cupomadicionado)
            valor *= (1 - cupom.desconto / 100)
        }

        const valorNumerico = Number(String(valor).replace(',', '.'))
        if (!Number.isFinite(valorNumerico) || valorNumerico <= 0) throw new Error(`Valor inválido para pagamento: ${valor}`)

        let providerStatus = paymentProviders.status();
        if (!providerStatus.provider && paymentProviders.configured('efi')) {
            providerStatus = paymentProviders.select('efi', process.env.EFI_MODE || 'sandbox');
        } else if (!providerStatus.provider && paymentProviders.configured('asaas')) {
            providerStatus = paymentProviders.select('asaas', process.env.ASAAS_MODE || 'sandbox');
        }
        if (!providerStatus.provider || !providerStatus.configured) {
            throw new Error('Configure o provedor de pagamento escolhido e suas credenciais no ambiente do bot.');
        }

        const ref = paymentProviders.createOrderRef(interaction.channel.id);
        const details = `\`${yy.quantidadeselecionada}x ${yy.infos.produto} - ${yy.infos.campo} | R$ ${valorNumerico.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\``;

        if (providerStatus.provider === 'efi') {
            const charge = await paymentProviders.createEfiPixCharge({
                ref,
                value: valorNumerico,
                description: `Pedido ${ref}`
            });
            const qrBuffer = await QRCode.toBuffer(charge.qrCode, { type: 'png', width: 640, margin: 1, errorCorrectionLevel: 'M' });
            const attachment = new AttachmentBuilder(qrBuffer, { name: 'pix-efi.png' });
            const embed = new EmbedBuilder()
                .setColor(`${configuracao.get(`Cores.Principal`) == null ? '2b2d31' : configuracao.get('Cores.Principal')}`)
                .setAuthor({ name: interaction.user.username, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
                .setTitle('Pagamento via Pix — Efí Bank')
                .setDescription('Escaneie o QR Code ou abra o código Pix Copia e Cola pelo botão abaixo. A confirmação é automática; não envie comprovante.')
                .addFields(
                    { name: '**Detalhes**', value: details },
                    { name: 'Pedido', value: `\`${ref}\``, inline: true },
                    { name: 'Expira em', value: '10 minutos', inline: true }
                )
                .setImage('attachment://pix-efi.png')
                .setFooter({ text: `${interaction.guild.name} - Pagamento processado com segurança pela Efí.` })
                .setTimestamp();
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('codigocopiaecola').setLabel('Mostrar Pix Copia e Cola').setStyle(2)
            );
            carrinhos.set(`${interaction.channel.id}.pagamentos`, { id: charge.id, ref, method: 'pix', provider: 'efi', cp: charge.qrCode });
            pagamentos.set(`${interaction.channel.id}.pagamentos`, {
                id: charge.id, ref, method: 'pix', provider: 'efi', value: valorNumerico.toFixed(2), data: Date.now()
            });
            await tt.edit({ embeds: [embed], content: '', components: [row], files: [attachment] });
        } else if (providerStatus.provider === 'asaas') {
            const checkout = await paymentProviders.createAsaasCheckout({
                ref,
                value: valorNumerico,
                description: `Pagamento - ${interaction.user.username}`,
                productName: yy.infos.produto,
                quantity: yy.quantidadeselecionada
            });
            const embed = new EmbedBuilder()
                .setColor(`${configuracao.get(`Cores.Principal`) == null ? '2b2d31' : configuracao.get('Cores.Principal')}`)
                .setAuthor({ name: interaction.user.username, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
                .setTitle('Pagamento via Pix')
                .setDescription('Clique no botão abaixo para abrir o checkout oficial do Asaas.')
                .addFields({ name: '**Detalhes**', value: details })
                .setFooter({ text: `${interaction.guild.name} - Checkout expira em 10 minutos.` })
                .setTimestamp();
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setLabel('Abrir checkout Asaas').setStyle(5).setURL(checkout.checkoutUrl)
            );
            carrinhos.set(`${interaction.channel.id}.pagamentos`, { id: checkout.id, ref, method: 'pix_checkout', provider: 'asaas' });
            pagamentos.set(`${interaction.channel.id}.pagamentos`, { id: checkout.id, ref, method: 'pix_checkout', provider: 'asaas', data: Date.now() });
            await tt.edit({ embeds: [embed], content: '', components: [row] });
        } else {
            throw new Error(`O provedor ${providerStatus.name || providerStatus.provider} ainda não está conectado ao checkout do carrinho.`);
        }
        await interaction.channel.setName(`💱・${yy.user.username}・${yy.user.id}`).catch(error => {
            console.warn('[Pagamento] Cobrança criada, mas não foi possível renomear o canal:', error.message);
        });
    } catch (error) {
        console.error('[Pagamento] Falha ao criar Pix:', error.message);
        const row3 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('pagarpix').setLabel('Pix').setStyle(3),
            new ButtonBuilder().setCustomId('pagarcrypto').setLabel('Crypto').setStyle(1).setDisabled(true),
            new ButtonBuilder().setCustomId('voltarcarrinho').setLabel('Voltar').setStyle(2)
        )
        await tt.edit({ content: 'Selecione uma forma de pagamento.', components: [row3], embeds: [] }).catch(() => {})
        await interaction.followUp({ content: '❌ | Não foi possível criar a cobrança Pix. Verifique as credenciais/certificado do provedor ou tente novamente mais tarde.', ephemeral: true }).catch(() => {})
    } finally {
        paymentCreationInProgress.delete(channelId);
    }
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
