const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, AttachmentBuilder } = require("discord.js")
const { pedidos, carrinhos, produtos, configuracao, estatisticas } = require("../DataBaseJson")
const { UpdateMessageProduto } = require("./SenderMessagesOrUpdates")
const { CheckPosition } = require("./PosicoesFunction")

async function EntregarPagamentos(client) {

    const yy22 = pedidos.fetchAll()

    for (const entrega of yy22) {
        let autoentrega
        const yy = carrinhos.get(entrega.ID)
        if (yy == null) continue

        const yyaa = produtos.get(yy.infos.produto)


        if (yyaa.Config.entrega == 'Sim') {
            autoentrega = true
        } else {
            autoentrega = false
        }

        let valor222 = 0
        const hhhh2121 = produtos.get(`${yy.infos.produto}.Campos`)
        const gggaaaae = hhhh2121.find(campo22 => campo22.Nome === yy.infos.campo)


        if (yy.cupomadicionado !== undefined) {
            const valor2 = gggaaaae.valor * yy.quantidadeselecionada

            const hhhh2 = produtos.get(`${yy.infos.produto}.Cupom`)
            const gggaaaawdwadwa = hhhh2.find(campo22 => campo22.Nome === yy.cupomadicionado)
            valor222 = valor2 * (1 - gggaaaawdwadwa.desconto / 100);
        } else {
            valor222 = gggaaaae.valor * yy.quantidadeselecionada
        }

        function gerarUUID() {
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
                const r = Math.random() * 16 | 0;
                const v = c === 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        }

        try {
            const channelaa = await client.channels.fetch(configuracao.get(`ConfigChannels.feedback`));
            channelaa.send({ content: `<@!${yy.user.id}>` }).then(msg => {
                setTimeout(async () => {
                    try {
                        await msg.delete();
                    } catch (error) {
                    }
                }, 5000);
            })
        } catch (error) {

        }


        await estatisticas.set(`${gerarUUID()}`, { produto: yy.infos.produto, campo: yy.infos.campo, quantidade: Number(yy.quantidadeselecionada), valor: Number(valor222), cupomaplicado: yy.cupomadicionado, data: Date.now(), guild: yy.guild.id, userid: yy.user.id, id: entrega.ID, idpagamento: entrega.data.id })

        CheckPosition(client)



        if (autoentrega == true) {



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


            const removedProducts = [];
            const removedIndices = [];
            for (let i = 0; i < yy.quantidadeselecionada; i++) {
                removedProducts.push(gggaaa.estoque[i]);
                removedIndices.push(i);
            }
            gggaaa.estoque.splice(0, yy.quantidadeselecionada);
            await produtos.set(`${yy.infos.produto}.Campos`, hhhh)
            UpdateMessageProduto(client, yy.infos.produto)




            const fileContent = removedProducts.join('\n');
            const attachment = new AttachmentBuilder(fileContent, { name: `${entrega.data.id}.txt` }, { type: 'text/plain' });












            const dsfjmsdfjnsdfj2 = new EmbedBuilder()
                .setColor(`${configuracao.get(`Cores.Sucesso`) == null ? `#7464ff` : configuracao.get(`Cores.Sucesso`)}`) //7464ff
                .setAuthor({ name: `Pedido #${entrega.data.id}` })
                .setTitle(`<:Posse:1350639278081970227> Entrega Realizada`)
                .setDescription(`<a:star_wolf:1344764324060725330> Seu produto foi anexado a essa mensagem`)
                .addFields(
                    { name: `**Detalhes**`, value: `\`${yy.quantidadeselecionada}x ${yy.infos.produto} - ${yy.infos.campo} | R$ ${Number(valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\`` },

                )
                .setFooter(
                    { text: yy.guild.name, iconURL: yy.guild.iconURL }
                )
                .setTimestamp()

            const row4 = new ActionRowBuilder()
                .addComponents(

                    new ButtonBuilder()
                        .setCustomId(`foraestoquealarme_${yy.infos.produto}_${yy.infos.campo}_1`)
                        .setLabel('Avisar atualizações de estoque')
                        .setEmoji(`1178066050076643458`)
                        .setStyle(1),


                )

            const yyaa = produtos.get(yy.infos.produto)
            const row6 = new ActionRowBuilder();
            if (yyaa && yyaa.mensagens && yyaa.mensagens[0]) {
                const { guildid, channelid, mesageid } = yyaa.mensagens[0];

                const buttonBuilder = new ButtonBuilder()
                    .setURL(`https://discord.com/channels/${guildid}/${channelid}/${mesageid}`)
                    .setLabel('Comprar novamente')
                    .setEmoji(`1178086986360307732`)
                    .setStyle(5);
                row6.addComponents(buttonBuilder);
            }

            try {
                const embedlogpublica = new EmbedBuilder()
                    .setColor(`#40fc04`)
                    .setAuthor({ name: `${yy.user.username}`, iconURL: yy.user.avatarURL })
                    .setTitle(`<:Posse:1350639278081970227> Entrega Realizada!`)
                    .setDescription(`Usuário <@!${yy.user.id}> teve seu pedido entregue`)
                    .addFields(
                        { name: `**Carrinho**`, value: `\`${yy.quantidadeselecionada}x ${yy.infos.produto} - ${yy.infos.campo}\`` },
                        { name: `**Valor pago**`, value: `\`R$ ${Number(valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\`` },
                    )
                    .setFooter(
                        { text: yy.guild.name, iconURL: yy.guild.iconURL }
                    )
                    .setTimestamp()

                const row7 = new ActionRowBuilder()
                    .addComponents(

                        new ButtonBuilder()
                            .setURL(`https://discord.com/channels/${yyaa.mensagens[0].guildid}/${yyaa.mensagens[0].channelid}/${yyaa.mensagens[0].mesageid}`)
                            .setLabel('Comprar')
                            .setEmoji(`1178086986360307732`)
                            .setStyle(5),
                    )


                const channelaa = await client.channels.fetch(configuracao.get(`ConfigChannels.eventbuy`));

                await channelaa.send({ embeds: [embedlogpublica], components: [row7] })

            } catch (error) {
            }


            try {
                if (gggaaa.roleadd !== undefined) {
                    await client.guilds.cache.get(yy.guild.id).members.fetch(yy.user.id).then(member => member.roles.add(gggaaa.roleadd)).catch(console.error);
                }
            } catch (error) {
            }
            try {
                if (gggaaa.rolerem !== undefined) {
                    await client.guilds.cache.get(yy.guild.id).members.fetch(yy.user.id).then(member => member.roles.remove(gggaaa.rolerem)).catch(console.error);
                }
            } catch (error) {

            }

            try {
                const cargoVip = configuracao.get('ConfigRoles.cargoVip');
                const limiteVip = Number(configuracao.get('ConfigRoles.valorVipMinimo') || 0);
                if (cargoVip && limiteVip > 0) {
                    const totalCompras = estatisticas.fetchAll()
                        .map(item => item.data)
                        .filter(item => item && String(item.userid) === String(yy.user.id))
                        .reduce((total, item) => total + Number(item.valor || 0), 0);
                    if (totalCompras >= limiteVip) {
                        await client.guilds.cache.get(yy.guild.id).members.fetch(yy.user.id)
                            .then(member => member.roles.add(cargoVip)).catch(console.error);
                    }
                }
            } catch (error) { }

            const member = await client.users.fetch(yy.user.id)
            try {
                if (yy.quantidadeselecionada > 5) {
                    await member.send({
                        files: [{
                            name: `${entrega.data.id}.txt`,
                            attachment: Buffer.from(fileContent, 'utf-8'),
                        }], components: [row4, row6], embeds: [dsfjmsdfjnsdfj2]
                    }).then(async aaaa => {

                        let threadChannel = await client.channels.fetch(entrega.ID);
                        const messages = await threadChannel.messages.fetch({ limit: 100 });
                        await threadChannel.bulkDelete(messages);

                        const umMinutoEmMilissegundos = 2 * 60 * 1000;
                        const timeStamp = Date.now() + umMinutoEmMilissegundos;

                        const row6 = new ActionRowBuilder()
                            .addComponents(

                                new ButtonBuilder()
                                    .setURL(aaaa.url)
                                    .setLabel('Ir para o pedido entregue')
                                    .setStyle(5),
                            )


                        await threadChannel.send({ components: [row6], content: `Entrega realizada! Verifique seu privado, esse ticket será excluído <t:${Math.ceil(timeStamp / 1000)}:R>` }).then(deletemsg => {

                            setTimeout(async () => {
                                try {
                                    await threadChannel.delete()
                                } catch (error) {

                                }

                            }, 120000);
                        })



                        threadChannel.setName(`✅・${yy.user.username}・${yy.user.id}`);
                    })
                } else if (yy.quantidadeselecionada <= 5) {
                    const Entrega = configuracao.get(`Emojis_EntregAbaixo`)
                    let msg2 = ``

                    if (Entrega !== null) {
                        Entrega.sort((a, b) => {
                            const numA = parseInt(a.name.replace('eb', ''), 10);
                            const numB = parseInt(b.name.replace('eb', ''), 10);
                            return numA - numB;
                        });

                        Entrega.forEach(element => {
                            console.log(element.name)
                            msg2 += `<:${element.name}:${element.id}>`
                        });
                    }

                    dsfjmsdfjnsdfj2.setFields(
                        { name: `**Carrinho**`, value: `\`${yy.quantidadeselecionada}x ${yy.infos.produto} - ${yy.infos.campo}\`` },
                        { name: `**Valor pago**`, value: `\`R$ ${Number(valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\`` },
                        { name: `${msg2 !== '' ? msg2 : 'Segue abaixo seus produtos:'}`, value: `${fileContent}` },
                    )


                    await member.send({
                        components: [row4, row6], embeds: [dsfjmsdfjnsdfj2]
                    }).then(async aaaa => {

                        let threadChannel = await client.channels.fetch(entrega.ID);
                        const messages = await threadChannel.messages.fetch({ limit: 100 });
                        await threadChannel.bulkDelete(messages);

                        const umMinutoEmMilissegundos = 2 * 60 * 1000;
                        const timeStamp = Date.now() + umMinutoEmMilissegundos;

                        const row6 = new ActionRowBuilder()
                            .addComponents(

                                new ButtonBuilder()
                                    .setURL(aaaa.url)
                                    .setLabel('Ir para o pedido entregue')
                                    .setStyle(5),
                            )


                        await threadChannel.send({ components: [row6], content: `Entrega realizada! Verifique seu privado, esse ticket será excluído <t:${Math.ceil(timeStamp / 1000)}:R>` }).then(deletemsg => {

                            setTimeout(async () => {
                                try {
                                    await threadChannel.delete()
                                } catch (error) {

                                }

                            }, 120000);
                        })



                        threadChannel.setName(`✅・${yy.user.username}・${yy.user.id}`);
                    })
                }


                try {
                    setTimeout(async () => {
                        const dd = configuracao.get(`ConfigChannels.feedback`)
                        if (dd !== null) {
                            const row6aa = new ActionRowBuilder()
                                .addComponents(
                                    ...[1, 2, 3, 4, 5].map(n => new ButtonBuilder()
                                        .setCustomId(`avaliar_${n}_${entrega.data.id}`)
                                        .setLabel(`${n}⭐`)
                                        .setStyle(n >= 4 ? 3 : n >= 3 ? 2 : 4))
                                )
                            await member.send({ components: [row6aa], content: `Eai, <@!${member.id}>, deu tudo certo? Avalie sua experiência com a Shadow Games:` })
                        }
                    }, 60000);
                } catch (error) {

                }







            } catch (error) {

                let threadChannel = await client.channels.fetch(entrega.ID);
                const messages = await threadChannel.messages.fetch({ limit: 100 });
                await threadChannel.bulkDelete(messages);


                const embedddd = new EmbedBuilder()
                    .setColor(`${configuracao.get(`Cores.Sucesso`) == null ? `#7464fc` : configuracao.get(`Cores.Sucesso`)}`) //7464fc
                    .setAuthor({ name: `Pedido #${entrega.data.id}` })
                    .setTitle(`🛒 Entrega realizada!`)
                    .setDescription(`Seu pedido foi anexado a essa mensagem.`)
                    .setFooter(
                        { text: yy.guild.name, iconURL: yy.guild.iconURL }
                    )
                    .setTimestamp()
                    .addFields(
                        { name: `**Detalhes**`, value: `\`${yy.quantidadeselecionada}x ${yy.infos.produto} - ${yy.infos.campo} | R$ ${Number(valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\`` },
                    )



                if (yy.quantidadeselecionada <= 5) {
                    const Entrega = configuracao.get(`Emojis_EntregAbaixo`)
                    let msg2 = ``
                    if (Entrega !== null) {
                        Entrega.sort((a, b) => {
                            const numA = parseInt(a.name.replace('eb', ''), 10);
                            const numB = parseInt(b.name.replace('eb', ''), 10);
                            return numA - numB;
                        });

                        Entrega.forEach(element => {
                            console.log(element.name)
                            msg2 += `<:${element.name}:${element.id}>`
                        });
                    }
                    embedddd.setFields(
                        { name: `**Detalhes**`, value: `\`${yy.quantidadeselecionada}x ${yy.infos.produto} - ${yy.infos.campo} | R$ ${Number(valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\`` },
                        { name: `${msg2 !== '' ? msg2 : 'Segue abaixo seus produtos:'}`, value: `${fileContent}` },
                    )
                }



                await threadChannel.send({
                    embeds: [embedddd], content: `<@${yy.user.id}> Não foi possível enviar seu pedido na sua DM, então ele foi anexado abaixo, esse ticket será excluído`
                })

                if (yy.quantidadeselecionada > 5) {
                    await threadChannel.send({
                        files: [{
                            name: `${entrega.data.id}.txt`,
                            attachment: Buffer.from(fileContent, 'utf-8'),
                        }]
                    })
                }

                threadChannel.setName(`✅・${yy.user.username}・${yy.user.id}`);

                setTimeout(async () => {
                    try {
                        await threadChannel.delete()
                    } catch (error) {

                    }

                }, 120000);

            }





            try {
                const lk = carrinhos.get(`${entrega.ID}.replys`)
                const channela = await client.channels.fetch(lk.channelid);
                const yuyu = await channela.messages.fetch(lk.idmsg)
                const row3 = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId(`editestoque_${yy.infos.produto}_${yy.infos.campo}`)
                            .setLabel('Editar estoque')
                            .setEmoji(`1187479020040884286`)
                            .setStyle(1),
                    )


                yuyu.reply({
                    files: [{
                        name: `${entrega.data.id}.txt`,
                        attachment: Buffer.from(fileContent, 'utf-8'),
                    }],

                    embeds: [
                        new EmbedBuilder()
                            .setColor(`${configuracao.get(`Cores.Sucesso`) == null ? `#7464fc` : configuracao.get(`Cores.Sucesso`)}`)
                            .setAuthor({ name: `Pedido #${entrega.data.id}` })
                            .setTitle(`Entrega Realizada`)
                            .setDescription(`Usuário <@!${yy.user.id}> teve seu pedido entregue.`)
                            .addFields(
                                { name: `**Detalhes**`, value: `\`${yy.quantidadeselecionada}x ${yy.infos.produto} - ${yy.infos.campo} | R$ ${Number(valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\`` },
                            )
                            .setFooter(
                                { text: yy.guild.name, iconURL: yy.guild.iconURL }
                            )
                            .setTimestamp()
                    ], components: [
                        row3
                    ]

                })

            } catch (error) {

            }


        }
        if (autoentrega == false) {


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


            const removedProducts = [];
            const removedIndices = [];
            for (let i = 0; i < yy.quantidadeselecionada; i++) {
                removedProducts.push(gggaaa.estoque[i]);
                removedIndices.push(i);
            }
            gggaaa.estoque.splice(0, yy.quantidadeselecionada);
            await produtos.set(`${yy.infos.produto}.Campos`, hhhh)
            await UpdateMessageProduto(client, yy.infos.produto)




            const fileContent = removedProducts.join('\n');
            const attachment = new AttachmentBuilder(fileContent, { name: `${entrega.data.id}.txt` }, { type: 'text/plain' });


            let threadChannel = await client.channels.fetch(entrega.ID);
            const messages = await threadChannel.messages.fetch({ limit: 100 });
            await threadChannel.bulkDelete(messages);




            const embed = new EmbedBuilder()
                .setAuthor({ name: `${yy.user.username} | Pedido: #${entrega.data.id}` })
                .setTitle(`Informação do pedido.`)
                .setColor(`${configuracao.get(`Cores.Principal`) == null ? `#008000` : configuracao.get(`Cores.Principal`)}`) //008000
                .setFields(
                    { name: 'Detalhes:', value: `\`${yy.quantidadeselecionada}x ${yy.infos.produto} - ${yy.infos.campo} | R$ ${Number(valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\`` },
                    { name: 'Status:', value: `Pagamento confirmado, aguardando entrega` }
                )
                .setFooter(
                    { text: yy.guild.name, iconURL: yy.guild.iconURL }
                )
                .setTimestamp()

            threadChannel.send({ content: `<@${yy.user.id}> Aguarde a entrega, ela será realizada nesse mesmo canal`, embeds: [embed] })



            threadChannel.setName(`🕔・${yy.user.username}・${yy.user.id}`);


            try {
                const lk = carrinhos.get(`${entrega.ID}.replys`)
                const channela = await client.channels.fetch(lk.channelid);
                const yuyu = await channela.messages.fetch(lk.idmsg)
                const embed = new EmbedBuilder()
                    .setAuthor({ name: `${yy.user.username} | Pedido: #${entrega.data.id}` })
                    .setTitle(`Informação do pedido.`)
                    .setColor(`${configuracao.get(`Cores.Principal`) == null ? `#008000` : configuracao.get(`Cores.Principal`)}`)
                    .setFields(
                        { name: 'Detalhes:', value: `\`${yy.quantidadeselecionada}x ${yy.infos.produto} - ${yy.infos.campo} | R$ ${Number(valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\`` },
                        { name: 'Status:', value: `Pagamento confirmado, aguardando entrega` },
                        { name: 'Cupom:', value: `Teste`, inline: true },
                        { name: 'UserID:', value: `${yy.user.id}`, inline: true }
                    )
                    .setFooter(
                        { text: yy.guild.name, iconURL: yy.guild.iconURL }
                    )
                    .setTimestamp()

                yuyu.reply({
                    embeds: [embed], files: [{
                        name: `${entrega.data.id}.txt`,
                        attachment: Buffer.from(fileContent, 'utf-8'),
                    }],
                })
            } catch (error) {

            }

        }





        }

        // Só remove da fila depois que a rotina terminou os caminhos de entrega.
        // Assim uma falha anterior ainda pode ser identificada e reprocessada.
        pedidos.delete(entrega.ID)
    }


module.exports = {
    EntregarPagamentos
}







