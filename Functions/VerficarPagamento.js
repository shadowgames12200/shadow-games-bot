const { EmbedBuilder, ActionRowBuilder, ButtonBuilder } = require("discord.js");
const { pagamentos, carrinhos, pedidos, produtos, configuracao } = require("../DataBaseJson")
const { BloquearBanco } = require("./BloquearBanco");
const { CheckPosition } = require("./PosicoesFunction");
const paymentProviders = require('../PaymentProviders');

let verificationRunning = false;
const asaasPaidStatuses = new Set(['RECEIVED', 'PAYMENT_RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH', 'CHECKOUT_PAID']);

async function processPayments(client) {
    const allPayments = pagamentos.fetchAll();

    for (const payment of allPayments) {
        if (pedidos.has(payment.ID)) {
            // Recover safely if the process restarted between queueing delivery
            // and removing the payment record.
            pagamentos.delete(payment.ID);
            continue;
        }
        const method = payment.data.pagamentos.method;
        const paymentDate = payment.data.pagamentos.data;
        const tenMinutesLater = paymentDate + 10 * 60 * 1000;

        let threadChannel
        try {
            threadChannel = await client.channels.fetch(payment.ID);

            const savedProvider = payment.data.pagamentos.provider;

            // Efí first checks the authoritative API status before expiring a
            // local order, so a payment completed while the bot was offline
            // is not discarded when the bot comes back after ten minutes.
            if (Date.now() > tenMinutesLater && savedProvider !== 'efi') {

                await threadChannel.delete()
                const texto = threadChannel.name;
                const partes = texto.split("・");
                const ultimoNumero = partes[partes.length - 1];
                const car = carrinhos.get(payment.ID);
                pagamentos.delete(payment.ID)
                carrinhos.delete(payment.ID)

                try {
                    const channela = await client.channels.fetch('1179580485874237460');

                    const mandanopvdocara = new EmbedBuilder()
                        .setColor(`${configuracao.get(`Cores.Erro`) == null ? `#ff0000` : configuracao.get(`Cores.Erro`)}`) //ff0000
                        .setAuthor({ name: `Pedido #${car.pagamentos.id}` })
                        .setTitle(`❌ Pagamento expirado`)
                        .setFooter(
                            { text: car.guild.name, iconURL: car.guild.iconURL }
                        )
                        .setTimestamp()
                        .setDescription(`Usuário <@!${ultimoNumero}> deixou o pagamento expirar.`);

                    await channela.send({ embeds: [mandanopvdocara] });
                } catch (error) {

                }
                return
            }

        } catch (error) {
            console.error(`[Pagamentos] Falha ao consultar o canal da fila ${payment.ID}:`, error.message);
            if (Number(error.code) === 10003) {
                // Remove only records whose Discord channel is definitively gone.
                pagamentos.delete(payment.ID);
                carrinhos.delete(payment.ID);
            }
            // Network/API errors are retried on the next verification pass.
            continue;
        }

        if (method === 'pix' || method === 'pix_checkout') {
            let res;
            const provider = payment.data.pagamentos.provider || (method === 'pix_checkout' ? 'asaas' : paymentProviders.status().provider);
            const isEfi = provider === 'efi';
            const isAsaas = provider === 'asaas';
            if (method === 'pix_checkout' && !isAsaas) {
                console.warn('[Pagamentos] Checkout Asaas pendente, mas o provedor Asaas não está selecionado.');
                continue;
            }
            if (!isEfi && !isAsaas && payment.data.pagamentos.id !== `Aprovado Manualmente`) {
                console.warn('[Pagamentos] Pagamento legado ignorado: nenhum provedor compatível está selecionado.');
                continue;
            }
            let efiPaid = false;
            if (payment.data.pagamentos.id !== `Aprovado Manualmente`) {
                if (isEfi) {
                    const localCharge = paymentProviders.getChargeByReference(payment.data.pagamentos.ref);
                    if (!localCharge || String(localCharge.providerId) !== String(payment.data.pagamentos.id)) {
                        console.warn(`[Pagamentos/Efí] Cobrança não correlacionada para o pedido ${payment.ID}; fila preservada.`);
                        continue;
                    }
                    try {
                        res = { data: await paymentProviders.getEfiCharge(localCharge.providerId, localCharge.mode || 'sandbox') };
                    } catch (error) {
                        console.error(`[Pagamentos/Efí] Falha ao consultar cobrança ${localCharge.providerId}:`, error.message);
                        continue;
                    }
                    efiPaid = paymentProviders.isEfiChargePaid(res.data, payment.data.pagamentos.value || localCharge.value);
                    if (efiPaid) {
                        localCharge.status = 'CONCLUIDA';
                        localCharge.paidAt ||= new Date().toISOString();
                        paymentProviders.save();
                    } else if (String(res.data?.status || '').toUpperCase() === 'CONCLUIDA') {
                        if (localCharge.status !== 'AMOUNT_MISMATCH') {
                            console.error(`[Pagamentos/Efí] Cobrança ${localCharge.providerId} concluída com valor diferente do pedido ${payment.ID}; entrega suspensa para revisão manual.`);
                        }
                        localCharge.status = 'AMOUNT_MISMATCH';
                        paymentProviders.save();
                        continue;
                    } else if (Date.now() > tenMinutesLater || ['REMOVIDA_PELO_USUARIO_RECEBEDOR', 'REMOVIDA_PELO_PSP'].includes(String(res.data?.status || '').toUpperCase())) {
                        await threadChannel.delete().catch(() => {});
                        pagamentos.delete(payment.ID);
                        carrinhos.delete(payment.ID);
                        continue;
                    } else {
                        continue;
                    }
                } else if (method === 'pix_checkout') {
                    const localCharge = paymentProviders.getChargeByReference(payment.data.pagamentos.ref);
                    res = { data: { status: localCharge?.status || 'PENDING' } };
                } else {
                    const localCharge = paymentProviders.findChargeByProviderId(payment.data.pagamentos.id);
                    if (!localCharge) {
                        console.warn(`[Pagamentos] Sem cobrança Asaas correlacionada para o registro ${payment.ID}; fila preservada.`);
                        continue;
                    }
                    const locallyReceived = asaasPaidStatuses.has(String(localCharge?.status || '').toUpperCase());
                    res = locallyReceived
                        ? { data: { status: localCharge.status } }
                        : { data: await paymentProviders.getAsaasPayment(payment.data.pagamentos.id) };
                }
            }
            const paid = isEfi
                ? efiPaid
                : isAsaas
                ? asaasPaidStatuses.has(String(res?.data?.status || '').toUpperCase())
                : res?.data?.status === 'approved';
            if (paid || payment.data.pagamentos.id == `Aprovado Manualmente`) {
                const yy = await carrinhos.get(payment.ID);
                const messages = await threadChannel.messages.fetch({ limit: 100 });
                await threadChannel.bulkDelete(messages);



                const mandanopvdocara = new EmbedBuilder()
                    .setColor(`${configuracao.get(`Cores.Principal`) == null ? '0cd4cc': configuracao.get('Cores.Principal')}`)
                    .setAuthor({ name: `${yy.user.globalName}` })
                    .setTitle(`🕔 Aguarde...`)
                    .setFooter(
                        { text: yy.guild.name, iconURL: yy.guild.iconURL }
                    )
                    .setTimestamp()
                const msg = await threadChannel.send({ embeds: [mandanopvdocara] })






                let valor = 0
                const hhhh = produtos.get(`${yy.infos.produto}.Campos`)
                const gggaaa = hhhh.find(campo22 => campo22.Nome === yy.infos.campo)


                if (yy.cupomadicionado !== undefined) {
                    const valor2 = gggaaa.valor * yy.quantidadeselecionada

                    const hhhh2 = produtos.get(`${yy.infos.produto}.Cupom`)
                    const gggaaaawdwadwa = hhhh2.find(campo22 => campo22.Nome === yy.cupomadicionado)
                    valor = valor2 * (1 - gggaaaawdwadwa.desconto / 100);
                } else {
                    valor = gggaaa.valor * yy.quantidadeselecionada
                }

                const lk = carrinhos.get(`${payment.ID}.replys`)
                let bank = isAsaas ? 'Asaas' : isEfi ? 'Efí Bank (Pix)' : res?.data?.point_of_interaction?.transaction_data?.bank_info?.payer?.long_name


                if (!isAsaas && !isEfi && configuracao.get('pagamentos.BancosBloqueados') !== null) {
                    const dd = await BloquearBanco(client, bank, payment.data.pagamentos.id, yy, msg)

                    const embed = new EmbedBuilder()
                        .setColor(`${configuracao.get(`Cores.Erro`) == null ? `#ff0000` : configuracao.get(`Cores.Erro`)}`)
                        .setAuthor({ name: `Pedido #${payment.ID}` })
                        .setTitle(`Pedido não aprovado`)
                        .setDescription(`A Wolf Store não está aceitando pagamentos desta instituição \`${bank}\`, seu dinheiro foi reembolsado, abra um ticket para realizar este pagamento.`)
                        .addFields(
                            { name: `Detalhes`, value: `\`${yy.quantidadeselecionada}x ${yy.infos.produto} - ${yy.infos.campo} | R$ ${Number(valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\`` }
                        )

                    const embed2 = new EmbedBuilder()
                        .setColor(`${configuracao.get(`Cores.Erro`) == null ? `#ff0000` : configuracao.get(`Cores.Erro`)}`)
                        .setAuthor({ name: `Pedido #${payment.ID}` })
                        .setTitle(`Anti Banco | Nova Venda`)
                        .setDescription(`Esse servidor não está aceitando pagamentos desta instituição \`${bank}\`, o dinheiro do comprador foi reembolsado.`).addFields(
                            { name: `Detalhes`, value: `\`${yy.quantidadeselecionada}x ${yy.infos.produto} - ${yy.infos.campo} | R$ ${Number(valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\`` }
                        )


                    if (dd?.status == 400) {

                        try {
                            const channela = await client.channels.fetch(lk.channelid);

                            const yuyu = await channela.messages.fetch(lk.idmsg)


                            yuyu.reply({ embeds: [embed2] })

                        } catch (error) {
                        }



                        msg.edit({ embeds: [embed], content: `` })

                        setInterval(async () => {
                            try { await threadChannel.delete() } catch (error) { }

                        }, 10000);
                        return
                    }

                }
                const status = (payment.data.pagamentos.id === 'Aprovado Manualmente') ? 'Aprovado Manualmente' : (isEfi ? 'CONCLUIDA' : isAsaas ? 'RECEIVED' : (res.data.status === 'pending' ? 'AutoApproved' : Number(payment.data.pagamentos.id)));
                pedidos.set(payment.ID, { id: status, method: method })
                pagamentos.delete(payment.ID)

                await msg.edit({ content: `🕔 Aguarde...`, embeds: [] })

                const mandanopvdocara2 = new EmbedBuilder()
                    .setColor(`${configuracao.get(`Cores.Processamento`) == null ? `#53c435` : configuracao.get(`Cores.Processamento`)}`) //53c435
                    .setAuthor({ name: `${yy.user.globalName}` })
                    .setTitle(`Pagamento confirmado`)
                    .setDescription('🕔 Aguarde...')
                    .setFooter(
                        { text: yy.guild.name, iconURL: yy.guild.iconURL }
                    )
                    .setTimestamp()

                await msg.edit({ embeds: [mandanopvdocara2], content: `` })








                const dsfjmsdfjnsdfj2 = new EmbedBuilder()
                    .setColor(`${configuracao.get(`Cores.Sucesso`) == null ? `#40fc04` : configuracao.get(`Cores.Sucesso`)}`) //40fc04
                    .setAuthor({ name: `Pedido #${payment.data.pagamentos.id}` })
                    .setTitle(`💸 Pedido aprovado`)
                    .setDescription(`Seu pagamento foi aprovado, processo de entrega iniciado...`)
                    .addFields(
                        { name: `**Detalhes**`, value: `\`${yy.quantidadeselecionada}x ${yy.infos.produto} - ${yy.infos.campo} | R$ ${Number(valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\`` },
                    )
                    .setFooter(
                        { text: yy.guild.name, iconURL: yy.guild.iconURL }
                    )
                    .setTimestamp()

                try {
                    const member = await client.users.fetch(yy.user.id)
                    await member.send({ embeds: [dsfjmsdfjnsdfj2] })
                } catch (error) {

                }



                const status2 = (payment.data.pagamentos.id === 'Aprovado Manualmente') ? 'Aprovado Manualmente' : (isEfi ? 'PIX_RECEBIDO' : isAsaas ? 'PAYMENT_RECEIVED' : (res.data.status === 'pending' ? 'AutoApproved' : bank));
                const dsfjmsdfjnsdfj222 = new EmbedBuilder()
                    .setColor(`${configuracao.get(`Cores.Sucesso`) == null ? `#40fc04` : configuracao.get(`Cores.Sucesso`)}`) //40fc04
                    .setAuthor({ name: `Pedido #${payment.data.pagamentos.id}` })
                    .setTitle(`💸 Pedido aprovado`)
                    .setDescription(`Usuário <@!${yy.user.id}> efetuou o pagamento.`)
                    .addFields(
                        { name: `**Detalhes**`, value: `\`${yy.quantidadeselecionada}x ${yy.infos.produto} - ${yy.infos.campo} | R$ ${Number(valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\`` },
                        { name: `Banco`, value: `\`${status2}\`` }
                    )
                    .setFooter(
                        { text: yy.guild.name, iconURL: yy.guild.iconURL }
                    )
                    .setTimestamp()


                const row222 = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId(`refoundd_${payment.data.pagamentos.id}`)
                            .setLabel('Extornar')
                            .setStyle(2)
                            .setEmoji(`1187468970891169853`)
                            .setDisabled(res?.data?.status == 'approved' ? false : true)
                    );




                try {
                    const channela = await client.channels.fetch(lk.channelid);

                    const yuyu = await channela.messages.fetch(lk.idmsg)
                    yuyu.reply({ embeds: [dsfjmsdfjnsdfj222], components: [row222] }).then(aaaaa => {
                        carrinhos.set(`${payment.ID}.replys`, { channelid: aaaaa.channel.id, idmsg: aaaaa.id })
                    })
                } catch (error) {

                }

                CheckPosition(client)
                try {
                    if (configuracao.get('ConfigRoles.cargoCliente') !== null) {
                        await client.guilds.cache.get(yy.guild.id).members.fetch(yy.user.id).then(member => member.roles.add(configuracao.get('ConfigRoles.cargoCliente'))).catch(console.error);
                    }
                } catch (error) {

                }







                CheckPosition(client)








                //threadChannel.setName(`🕔・${yy.user.username}・${yy.user.id}`);

            }


        } else if (method === 'site') {
            console.log('Payment method is site');
        } else {
            console.log(`Unknown payment method: ${method}`);
        }
    }
}




async function VerificarPagamento(client) {
    if (verificationRunning) return false;
    verificationRunning = true;
    try {
        await processPayments(client);
        return true;
    } finally {
        verificationRunning = false;
    }
}


module.exports = {
    VerificarPagamento
}


