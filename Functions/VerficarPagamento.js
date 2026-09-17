const { EmbedBuilder, ActionRowBuilder, ButtonBuilder } = require("discord.js");
const { pagamentos, carrinhos, pedidos, produtos, configuracao } = require("../DataBaseJson")
const axios = require("axios");
const { BloquearBanco } = require("./BloquearBanco");
const { CheckPosition } = require("./PosicoesFunction");
const paymentProviders = require('../PaymentProviders');

async function VerificarPagamento(client) {
    const allPayments = pagamentos.fetchAll();

    for (const payment of allPayments) {
        const method = payment.data.pagamentos.method;
        const paymentDate = payment.data.pagamentos.data;

        let threadChannel
        try {
            threadChannel = await client.channels.fetch(payment.ID);

            const tenMinutesLater = paymentDate + 10 * 60 * 1000;

            if (Date.now() > tenMinutesLater) {

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
            console.error(`Error processing PIX payment for ID ${payment.ID}: ${error}`);
            pagamentos.delete(payment.ID);
            carrinhos.delete(payment.ID)
        }

        if (method === 'pix') {
            let res;
            const isAsaas = paymentProviders.status().provider === 'asaas';
            if (payment.data.pagamentos.id !== `Aprovado Manualmente`) {
                if (isAsaas) res = { data: await paymentProviders.getAsaasPayment(payment.data.pagamentos.id) };
                else res = await axios.get(`https://api.mercadopago.com/v1/payments/${payment.data.pagamentos.id}`, { headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN || configuracao.get('pagamentos.MpAPI')}` } });
            }
            const paid = isAsaas ? res?.data?.status === 'RECEIVED' : res?.data?.status === 'approved';
            if (paid || payment.data.pagamentos.id == `Aprovado Manualmente`) {
                pagamentos.delete(payment.ID)
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
                let bank = isAsaas ? 'Asaas' : res?.data?.point_of_interaction?.transaction_data?.bank_info?.payer?.long_name


                if (!isAsaas && configuracao.get('pagamentos.BancosBloqueados') !== null) {
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
                const status = (payment.data.pagamentos.id === 'Aprovado Manualmente') ? 'Aprovado Manualmente' : (isAsaas ? 'RECEIVED' : (res.data.status === 'pending' ? 'AutoApproved' : Number(payment.data.pagamentos.id)));
                pedidos.set(payment.ID, { id: status, method: method })

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



                const status2 = (payment.data.pagamentos.id === 'Aprovado Manualmente') ? 'Aprovado Manualmente' : (isAsaas ? 'PAYMENT_RECEIVED' : (res.data.status === 'pending' ? 'AutoApproved' : bank));
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




module.exports = {
    VerificarPagamento
}







