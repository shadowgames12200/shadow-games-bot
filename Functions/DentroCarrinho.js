
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, AttachmentBuilder } = require("discord.js")
const { produtos, carrinhos, pagamentos, configuracao } = require("../DataBaseJson")
const { QuickDB } = require("quick.db");
const paymentProviders = require('../PaymentProviders');
const QRCode = require('qrcode');
const db = new QuickDB();
const paymentCreationInProgress = new Set();
const REVOLUT_EUR = process.env.REVOLUT_EUR_DETAILS || 'Configure REVOLUT_EUR_DETAILS no Render.';
const REVOLUT_USD = process.env.REVOLUT_USD_DETAILS || 'Configure REVOLUT_USD_DETAILS no Render.';
const EMOJI_PIX = process.env.EMOJI_PIX || { id: '1554175847601147966', name: 'emoji_42' };
const EMOJI_CARD = process.env.EMOJI_CARD || { id: '1554175727937527818', name: 'emoji_41' };
const EMOJI_CURRENCY = process.env.EMOJI_CURRENCY || { id: '1554176158835277875', name: 'emoji_43' };
const EMOJI_BACK = process.env.EMOJI_BACK || { id: '1554175586589614260', name: 'emoji_40' };


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

        const providerStatus = paymentProviders.status();
        if (!providerStatus.provider) {
            throw new Error('Selecione o provedor e o ambiente em /botconfig → Definições → Formas de pagamento antes de receber pedidos.');
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
            new ButtonBuilder().setCustomId('pagarpix').setLabel('Pix').setEmoji(EMOJI_PIX).setStyle(3),
            new ButtonBuilder().setCustomId('pagarcartao').setLabel('Cartão de crédito').setEmoji(EMOJI_CARD).setStyle(1),
            new ButtonBuilder().setCustomId('pagarinternacional').setLabel('Dólar/Euro').setEmoji(EMOJI_CURRENCY).setStyle(1),
            new ButtonBuilder().setCustomId('voltarcarrinho').setLabel('Voltar').setEmoji(EMOJI_BACK).setStyle(2)
        )
        await tt.edit({ content: 'Selecione uma forma de pagamento.', components: [row3], embeds: [] }).catch(() => {})
        await interaction.followUp({ content: '❌ | Não foi possível criar a cobrança Pix. Verifique as credenciais/certificado do provedor ou tente novamente mais tarde.', ephemeral: true }).catch(() => {})
    } finally {
        paymentCreationInProgress.delete(channelId);
    }
}


async function DentroCarrinhoCard(interaction) {
    await interaction.deferUpdate();
    const channelId = String(interaction.channel.id);
    if (paymentCreationInProgress.has(channelId) || pagamentos.has(`${channelId}.pagamentos`)) {
        return interaction.followUp({ content: 'Já existe um pagamento pendente neste pedido.', ephemeral: true }).catch(() => {});
    }
    paymentCreationInProgress.add(channelId);
    try {
        const yy = await carrinhos.get(channelId);
        const campos = produtos.get(`${yy.infos.produto}.Campos`);
        const campo = campos.find(item => item.Nome === yy.infos.campo);
        let valor = Number(campo.valor) * Number(yy.quantidadeselecionada);
        const ref = paymentProviders.createOrderRef(channelId);
        const link = await paymentProviders.createEfiPaymentLink({ ref, value: valor,
            description: `Pedido ${ref}`, productName: yy.infos.produto,
            quantity: yy.quantidadeselecionada });
        const embed = new EmbedBuilder()
            .setColor(configuracao.get('Cores.Principal') || '2b2d31')
            .setTitle('Pagamento via cartão — Efí Bank')
            .setDescription('Clique abaixo para abrir o checkout seguro da Efí. O bot não recebe os dados do cartão.')
            .addFields({ name: 'Detalhes', value: `\`${yy.quantidadeselecionada}x ${yy.infos.produto} - ${yy.infos.campo} | R$ ${valor.toFixed(2)}\`` })
            .setFooter({ text: `${interaction.guild.name} - Link da Efí` }).setTimestamp();
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setLabel('Abrir pagamento Efí').setStyle(5).setURL(link.paymentUrl),
            new ButtonBuilder().setCustomId('voltarcarrinho').setLabel('Voltar').setEmoji(EMOJI_BACK).setStyle(2)
        );
        carrinhos.set(`${channelId}.pagamentos`, { id: link.id, ref, method: 'credit_card', provider: 'efi', paymentUrl: link.paymentUrl });
        pagamentos.set(`${channelId}.pagamentos`, { id: link.id, ref, method: 'credit_card', provider: 'efi', value: valor.toFixed(2), data: Date.now() });
        await interaction.message.edit({ content: '', embeds: [embed], components: [row] });
    } catch (error) {
        console.error('[Pagamento] Falha ao criar link de cartão:', error.message);
        await interaction.message.edit({ content: 'Não foi possível criar o link de cartão. Habilite a API de Emissões e cartão na Efí.', embeds: [], components: [] }).catch(() => {});
        await interaction.followUp({ content: '❌ O cartão ainda não está habilitado na aplicação Efí ou faltam credenciais da API Cobranças.', ephemeral: true }).catch(() => {});
    } finally { paymentCreationInProgress.delete(channelId); }
}

async function DentroCarrinhoInternational(interaction) {
    await interaction.deferUpdate();
    const yy = await carrinhos.get(interaction.channel.id);
    const campos = produtos.get(`${yy.infos.produto}.Campos`);
    const campo = campos.find(item => item.Nome === yy.infos.campo);
    const valor = Number(campo.valor) * Number(yy.quantidadeselecionada);
    const embed = new EmbedBuilder().setColor(configuracao.get('Cores.Principal') || '2b2d31')
        .setTitle('Pagamento internacional — Revolut')
        .setDescription('Pagamento manual em dólar ou euro. Escolha a moeda, faça a transferência e envie o comprovante neste canal. O produto só será liberado após a conferência da equipe.')
        .addFields({ name: 'Valor do pedido', value: `R$ ${valor.toFixed(2)}` },
            { name: 'EUR — Revolut', value: REVOLUT_EUR },
            { name: 'USD — Revolut', value: REVOLUT_USD },
            { name: 'Importante', value: 'Use os dados da mesma moeda. Não envie senha, código de segurança ou chave privada.' })
        .setFooter({ text: `${interaction.guild.name} - Conferência manual` }).setTimestamp();
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('comprovanteinternacional').setLabel('Enviei o comprovante').setEmoji('📎').setStyle(3),
        new ButtonBuilder().setCustomId('confirmarpagamentomanual').setLabel('Aprovar após conferir').setStyle(3),
        new ButtonBuilder().setCustomId('voltarcarrinho').setLabel('Voltar').setEmoji(EMOJI_BACK).setStyle(2)
    );
    await interaction.message.edit({ content: `<@${interaction.user.id}>`, embeds: [embed], components: [row] });
}

async function DentroCarrinho2(interaction) {

    const yd = carrinhos.get(interaction.channel.id)

    const hhhh = produtos.get(`${yd.infos.produto}.Campos`)
    const gggaaa = hhhh.find(campo22 => campo22.Nome === yd.infos.campo)


    if (yd.quantidadeselecionada > gggaaa.condicao?.valormaximo) return interaction.reply({ content: `❌ | Você não pode comprar mais de \`${gggaaa.condicao.valormaximo}x ${yd.infos.produto} - ${yd.infos.campo}\``, ephemeral: true })
    if (yd.quantidadeselecionada < gggaaa.condicao?.valorminimo) return interaction.reply({ content: `❌ | Você não pode comprar mais de \`${gggaaa.condicao.valorminimo}x ${yd.infos.produto} - ${yd.infos.campo}\``, ephemeral: true })
    await interaction.deferUpdate()

    // content: `Selecione uma forma de pagamento.`


    const row3 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('pagarpix').setLabel('Pix').setEmoji(EMOJI_PIX).setStyle(3),
        new ButtonBuilder().setCustomId('pagarcartao').setLabel('Cartão de crédito').setEmoji(EMOJI_CARD).setStyle(1),
        new ButtonBuilder().setCustomId('pagarinternacional').setLabel('Dólar/Euro').setEmoji(EMOJI_CURRENCY).setStyle(1),
        new ButtonBuilder().setCustomId('voltarcarrinho').setLabel('Voltar').setEmoji(EMOJI_BACK).setStyle(2)
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
    DentroCarrinhoPix,
    DentroCarrinhoCard,
    DentroCarrinhoInternational
}
