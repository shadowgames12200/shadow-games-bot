const { WebhookClient, EmbedBuilder, ActionRowBuilder, ButtonBuilder } = require("discord.js");
const { configuracao } = require("../../DataBaseJson");


module.exports = {
    name: 'guildMemberAdd',

    run: async (member, client) => {

        try {
            const channelaasdawdw = configuracao.get(`Entradas.channelid`)

            const gggg = configuracao.get(`Entradas.msg`)

            const mapeamentoSubstituicao = {
                "{member}": `<@${member.user.id}>`,
                "{guildname}": `${member.guild.name}`
            };

            const substituirPalavras = (match) => mapeamentoSubstituicao[match] || match;
            const stringNova = gggg.replace(/{member}|{guildname}/g, substituirPalavras);


            const row222 = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('asSs')
                        .setLabel('Mensagem do Sistema')
                        .setStyle(2)
                        .setDisabled(true)
                );

            if (channelaasdawdw.lenght !== 0) {



                channelaasdawdw.forEach(async element => {
                    try {
                        const channela = client.channels.cache.get(element)
                        await channela.send({ components: [row222], content: `${stringNova}` }).then(msg => {
                            if (configuracao.get(`Entradas.tempo`) > 0) {
                                setTimeout(async () => {
                                    try {
                                        await msg.delete();
                                    } catch (error) {
                                        console.error('Erro ao deletar mensagem:', error);
                                    }
                                }, configuracao.get(`Entradas.tempo`) * 1000);
                            }
                        })
                    } catch (error) {

                    }
                });
            } else {
                const channela = client.channels.cache.get(configuracao.get(`Entradas.entradas`))
                await channela.send({ components: [row222], content: `${stringNova}` }).then(msg => {
                    if (configuracao.get(`Entradas.tempo`) > 0) {
                        setTimeout(async () => {
                            try {
                                await msg.delete();
                            } catch (error) {
                                console.error('Erro ao deletar mensagem:', error);
                            }
                        }, configuracao.get(`Entradas.tempo`) * 1000);
                    }
                })
            }


        } catch (error) {
        }

        const fffffffff2222222 = configuracao.get(`AntiFake.nomes`)

        if (fffffffff2222222 !== null) {

            const contemNome = fffffffff2222222.some(nome => member.user.username.includes(nome))

            if (contemNome) {

                await member.kick()
                const embed = new EmbedBuilder()
                    .setAuthor({ name: `${member.user.username}` })
                    .setTitle(`Anti-Fake`)
                    .setDescription(`Usuário foi expulso por ter o nome \`${member.user.username}\` que está na blacklist.`)
                    .addFields(
                        { name: `User ID`, value: `${member.user.id}`, inline: true },
                        { name: `Data de criação`, value: `<t:${Math.ceil(getCreationDateFromSnowflake(member.user.id) / 1000)}:R>`, inline: true }
                    )
                    .setFooter({
                        text: `${member.guild.name}`
                    })
                    .setTimestamp()
                    .setColor(`${configuracao.get(`Cores.Principal`) == null ? `#fcba03` : configuracao.get(`Cores.Principal`)}`)

                try {
                    const channela = client.channels.cache.get(configuracao.get(`ConfigChannels.boasvindascoole`));
                    channela.send({ embeds: [embed] })
                } catch (error) {

                }

            }


        }

        const fffffffff2222 = configuracao.get(`AntiFake.status`)

        if (fffffffff2222 !== null) {

            try {
                await member.fetch(true)
                const presence = member.presence
                const customStatusActivity = presence.activities.find(activity => activity.type === 4);
                const customStatusState = customStatusActivity ? customStatusActivity.state : null;


                const contemNome = fffffffff2222.some(nome => customStatusState.includes(nome))
                if (contemNome) {

                    await member.kick()
                    const embed = new EmbedBuilder()
                        .setAuthor({ name: `${member.user.username}` })
                        .setTitle(`Anti-Fake`)
                        .setDescription(`Usuário foi expulso por ter o status \`${customStatusState}\` na blacklist.`)
                        .addFields(
                            { name: `User ID`, value: `${member.user.id}`, inline: true },
                            { name: `Data de criação`, value: `<t:${Math.ceil(getCreationDateFromSnowflake(member.user.id) / 1000)}:R>`, inline: true }
                        )
                        .setFooter({
                            text: `${member.guild.name}`
                        })
                        .setTimestamp()
                        .setColor(`${configuracao.get(`Cores.Principal`) == null ? `#fcba03` : configuracao.get(`Cores.Principal`)}`)

                    try {
                        const channela = client.channels.cache.get(configuracao.get(`ConfigChannels.boasvindascoole`));
                        channela.send({ embeds: [embed] })
                    } catch (error) {

                    }

                }
            } catch (error) {

            }
        }

        const fffffffff = configuracao.get(`AntiFake.diasminimos`)

        if (fffffffff !== null) {

            const dataCriacaoConta = new Date(getCreationDateFromSnowflake(member.user.id));

            const dataAtual = new Date();

            const diferencaEmMilissegundos = dataAtual - dataCriacaoConta;

            const diasDecorridos = Math.floor(diferencaEmMilissegundos / (1000 * 60 * 60 * 24));

            if (diasDecorridos < fffffffff) {
                await member.kick()


                const embed = new EmbedBuilder()
                    .setAuthor({ name: `${member.user.username}` })
                    .setTitle(`Anti-Fake`)
                    .setDescription(`Usuário foi expulso por ter uma conta com menos de \`${diasDecorridos}\` dias.`)
                    .addFields(
                        { name: `User ID`, value: `${member.user.id}`, inline: true },
                        { name: `Data de criação`, value: `<t:${Math.ceil(getCreationDateFromSnowflake(member.user.id) / 1000)}:R>`, inline: true }
                    )
                    .setFooter({
                        text: `${member.guild.name}`
                    })
                    .setTimestamp()
                    .setColor(`${configuracao.get(`Cores.Principal`) == null ? `#fcba03` : configuracao.get(`Cores.Principal`)}`)

                try {
                    const channela = client.channels.cache.get(configuracao.get(`ConfigChannels.boasvindascoole`));
                    channela.send({ embeds: [embed] })
                } catch (error) {

                }


            }
        }
    }
}