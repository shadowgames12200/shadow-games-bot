const { ActionRowBuilder, TextInputBuilder, TextInputStyle, InteractionType, ModalBuilder, EmbedBuilder, ButtonBuilder } = require("discord.js");
const { configuracao } = require("../../DataBaseJson");
const { Gerenciar } = require("../../Functions/Gerenciar");
const { FormasDePagamentos } = require("../../Functions/FormasDePagamentosConfig");
const axios = require('axios');
const mercadopago = require('mercadopago');
const payments = require('../../PaymentProviders');
const { msgbemvindo } = require("../../Functions/MensagemBemVindo");

module.exports = {
    name: 'interactionCreate',

    run: async (interaction, client) => {

        if (interaction.isButton()) {


            if (interaction.customId === 'editarmensagemboasvindas') {

                const modalaAA = new ModalBuilder()
                    .setCustomId('sdaju111idsjjsdua')
                    .setTitle(`Editar Boas Vindas`);

                const newnameboteN = new TextInputBuilder()
                    .setCustomId('tokenMP')
                    .setLabel(`Mensagem`)
                    .setPlaceholder(`Insira aqui sua mensagem, use {member} para mencionar o membro e {guildname} para o servidor.`)
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(true)
                    .setMaxLength(1000)

                const newnameboteN2 = new TextInputBuilder()
                    .setCustomId('tokenMP2')
                    .setLabel(`TEMPO PARA APAGAR A MENSAGEM`)
                    .setPlaceholder(`Insira aqui a quantidade em segundos.`)
                    .setStyle(TextInputStyle.Short)
                    .setRequired(false)
                    .setMaxLength(6)


                const newnameboteN3 = new TextInputBuilder()
                    .setCustomId('qualcanal')
                    .setLabel(`QUAL CANAL VAI SER ENVIADO?`)
                    .setPlaceholder(`Insira aqui o ID do canal que vai enviar. (ID, ID, ID)`)
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(false)

                const firstActionRow3 = new ActionRowBuilder().addComponents(newnameboteN);
                const firstActionRow4 = new ActionRowBuilder().addComponents(newnameboteN2);
                const firstActionRow5 = new ActionRowBuilder().addComponents(newnameboteN3);


                modalaAA.addComponents(firstActionRow3, firstActionRow4, firstActionRow5);
                await interaction.showModal(modalaAA);

            }



            if (interaction.customId == '+18porra') {

                const modalaAA = new ModalBuilder()
                    .setCustomId('tokenMP')
                    .setTitle(`Alterar Token`);

                const newnameboteN = new TextInputBuilder()
                    .setCustomId('tokenMP')
                    .setLabel("TOKEN: APP_USR-000000000000000-XX...")
                    .setPlaceholder("APP_USR-000000000000000-XX...")
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
                    .setMaxLength(256)

                const firstActionRow3 = new ActionRowBuilder().addComponents(newnameboteN);
                modalaAA.addComponents(firstActionRow3);
                await interaction.showModal(modalaAA);

            }

            if (interaction.customId == '-18porra') {


                const fernandinhaa = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setStyle(5)
                            .setURL(`https://stormappsauth.squareweb.app/auth2/${interaction.guild.id}/VendasPrivadaV2`)
                            .setDisabled(true)
                            .setLabel('Autorizar Mercado Pago'),
                        new ButtonBuilder()
                            .setCustomId('configurarmercadopago')
                            .setStyle(1)
                            .setEmoji('⬅️')

                    )

                const forFormat = Date.now() + 10 * 60 * 1000

                const timestamp = Math.floor(forFormat / 1000)

                interaction.update({ embeds: [], content: `Autorizar seu **Mercado Pago** á **Node Applications**\n\n**Status:** Aguardando você autorizar.\nEssa mensagem vai expirar em <t:${timestamp}:R>\n (Para autorizar, clique no botão abaixo, selecione 'Brasil' e clique em Continuar/Confirmar/Autorizar)`, components: [fernandinhaa] }).then(async msgg => {

                    const response2 = await axios.get(`https://stormappsauth.squareweb.app/token2/${interaction.guild.id}/VendasPrivadaV2`);
                    const geral = response2.data;

                    var existia = null

                    if (geral.message !== 'Usuario nao encontado!') {
                        existia = geral.access_token
                    } else {
                        existia = 'Não definido'
                    }

                    var status = false;
                    var intervalId = null;
                    var tempoLimite = 5 * 60 * 1000;

                    if (status === false) {
                        intervalId = setInterval(async () => {
                            const response = await axios.get(`https://stormappsauth.squareweb.app/token2/${interaction.guild.id}/VendasPrivadaV2`);
                            const geral = response.data;

                            if (geral.message == 'Usuario nao encontado!') {
                                status = false;
                            } else {
                                if (existia === 'Não definido' || existia !== geral.access_token) {
                                    status = true;
                                    clearInterval(intervalId);
                                    configuracao.set(`pagamentos.MpAPI`, geral.access_token)

                                    const fernandinhaa = new ActionRowBuilder()
                                        .addComponents(
                                            new ButtonBuilder()
                                                .setCustomId('configurarmercadopago')
                                                .setStyle(1)
                                                .setEmoji('⬅️')

                                        )

                                    interaction.editReply({
                                        content: `**Status:** ✅ Autorização bem sucedida!.`,
                                        components: [fernandinhaa]
                                    })
                                }
                            }
                        }, 5000);
                        setTimeout(() => {
                            clearInterval(intervalId);

                            const fernandinhaa = new ActionRowBuilder()
                                .addComponents(
                                    new ButtonBuilder()
                                        .setCustomId('voltar1234sda')
                                        .setStyle(1)
                                        .setEmoji('⬅️')

                                )

                            interaction.editReply({
                                embeds: [
                                    new EmbedBuilder()
                                        .setDescription('❌ | Você não se cadastrou durante 5 Minutos, cadastre-se novamente!')
                                ],
                                components: [fernandinhaa]
                            })

                        }, tempoLimite);
                    }
                })
            }


            if (interaction.customId === 'voltaradawdwa') {
                Gerenciar(interaction, client)
            }
            if (interaction.customId === 'formasdepagamentos') {
                FormasDePagamentos(interaction)

            }
            if (interaction.customId == 'configurarmercadopago') {

                const fernandona = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId("+18porra")
                            .setLabel('Setar Acess Token')
                            .setEmoji(`1190777128044724378`)
                            .setStyle(1)
                            .setDisabled(false),
                        new ButtonBuilder()
                            .setCustomId("-18porra")
                            .setLabel('Autenticar MercadoPago [-18]')
                            .setEmoji(`1190793840697806855`)
                            .setStyle(3)
                            .setDisabled(false),
                        new ButtonBuilder()
                            .setCustomId("bloquearbancos")
                            .setLabel('Bloquear Bancos')
                            .setEmoji(`🏦`)
                            .setStyle(4)
                            .setDisabled(false),

                        new ButtonBuilder()
                            .setCustomId("formasdepagamentos")
                            .setLabel('Voltar')
                            .setEmoji(`⬅️`)
                            .setStyle(2)
                            .setDisabled(false),

                    )

                interaction.update({ embeds: [], components: [fernandona], content: `O que precisa configurar?` })


            }

            if (interaction.customId === 'configurarasaas') {
                payments.ensure();
                const modal = new ModalBuilder().setCustomId('salvarasaas').setTitle('Configurar Asaas');
                const key = new TextInputBuilder().setCustomId('asaas_api_key').setLabel('Chave API do Asaas').setStyle(TextInputStyle.Short).setRequired(true);
                const secret = new TextInputBuilder().setCustomId('asaas_webhook_secret').setLabel('Token secreto do webhook').setStyle(TextInputStyle.Short).setRequired(false);
                const mode = new TextInputBuilder().setCustomId('asaas_mode').setLabel('Modo: sandbox ou production').setValue(payments.db.payment.mode || 'sandbox').setStyle(TextInputStyle.Short).setRequired(true);
                modal.addComponents(new ActionRowBuilder().addComponents(key), new ActionRowBuilder().addComponents(secret), new ActionRowBuilder().addComponents(mode));
                return interaction.showModal(modal);
            }

            if (interaction.customId === 'configurarbancopan') {
                const pan = configuracao.get('pagamentos.BancoPAN') || {}
                const modal = new ModalBuilder()
                    .setCustomId('salvarbancopan')
                    .setTitle('Configurar Banco PAN');

                const apiUrl = new TextInputBuilder()
                    .setCustomId('pan_api_url')
                    .setLabel('URL da API Pix')
                    .setPlaceholder('https://api.exemplo.com')
                    .setValue(pan.apiUrl || '')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(false);
                const clientId = new TextInputBuilder()
                    .setCustomId('pan_client_id')
                    .setLabel('Client ID')
                    .setValue(pan.clientId || '')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(false);
                const clientSecret = new TextInputBuilder()
                    .setCustomId('pan_client_secret')
                    .setLabel('Client Secret')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(false);
                const accessToken = new TextInputBuilder()
                    .setCustomId('pan_access_token')
                    .setLabel('Token de acesso')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(false);
                const pixKey = new TextInputBuilder()
                    .setCustomId('pan_pix_key')
                    .setLabel('Chave Pix de recebimento')
                    .setValue(pan.pixKey || '')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(false);

                modal.addComponents(
                    new ActionRowBuilder().addComponents(apiUrl),
                    new ActionRowBuilder().addComponents(clientId),
                    new ActionRowBuilder().addComponents(clientSecret),
                    new ActionRowBuilder().addComponents(accessToken),
                    new ActionRowBuilder().addComponents(pixKey)
                );
                await interaction.showModal(modal);
            }

            if (interaction.customId == 'bloquearbancos') {
                const gfgfggfg = configuracao.get(`pagamentos.BancosBloqueados`)
                var hhhh = ''
                for (const key in gfgfggfg) {
                    const element = gfgfggfg[key];
                    hhhh += `${element}`;
                    if (key !== Object.keys(gfgfggfg)[Object.keys(gfgfggfg).length - 1]) {
                        hhhh += ', ';
                    }
                }

                const modalaAA = new ModalBuilder()
                    .setCustomId('joaozinhompbanco')
                    .setTitle(`Bloquear Bancos`);

                const newnameboteN2 = new TextInputBuilder()
                    .setCustomId('tokenMP2')
                    .setLabel("BANCOS BLOQUEADOS")
                    .setPlaceholder(`Insira os bancos que deseja recusar separado por vírgula, ex: inter, nu`)
                    .setStyle(TextInputStyle.Paragraph)
                    .setValue(hhhh)
                    .setRequired(false)

                const firstActionRow4 = new ActionRowBuilder().addComponents(newnameboteN2);
                modalaAA.addComponents(firstActionRow4);
                await interaction.showModal(modalaAA);
            }
        }
        if (interaction.type == InteractionType.ModalSubmit) {

            if (interaction.customId === 'salvarasaas') {
                payments.ensure();
                payments.db.payment.ASAAS_API_KEY = interaction.fields.getTextInputValue('asaas_api_key').trim();
                payments.db.payment.webhookSecret = interaction.fields.getTextInputValue('asaas_webhook_secret').trim();
                payments.db.payment.mode = interaction.fields.getTextInputValue('asaas_mode').trim().toLowerCase() === 'production' ? 'production' : 'sandbox';
                payments.db.payment.provider = 'asaas';
                payments.save();
                return interaction.reply({ content: '✅ Asaas configurado e selecionado. Configure no Asaas o webhook usando a URL pública do Render + /webhooks/payments/asaas.', ephemeral: true });
            }

            if (interaction.customId === 'salvarbancopan') {
                const atual = configuracao.get('pagamentos.BancoPAN') || {};
                const valor = (id) => interaction.fields.getTextInputValue(id).trim();
                configuracao.set('pagamentos.BancoPAN', {
                    ...atual,
                    apiUrl: valor('pan_api_url'),
                    clientId: valor('pan_client_id'),
                    clientSecret: valor('pan_client_secret') || atual.clientSecret || '',
                    accessToken: valor('pan_access_token') || atual.accessToken || '',
                    pixKey: valor('pan_pix_key'),
                    enabled: false,
                    configuredAt: Date.now()
                });
                await FormasDePagamentos(interaction);
                return;
            }

            if (interaction.customId === 'sdaju111idsjjsdua') {
                const title = interaction.fields.getTextInputValue('tokenMP');
                let title2 = interaction.fields.getTextInputValue('tokenMP2');
                const title3 = interaction.fields.getTextInputValue('qualcanal');
                let arrayDeBancos
                if (title3 !== '') {
                    const stringSemEspacos = title3.replace(/\s/g, '');
                    arrayDeBancos = stringSemEspacos.split(',');
                } else {
                    arrayDeBancos = []
                }

                if (title2 !== '') {
                    if (isNaN(title2) == true) return interaction.reply({ content: `❌ | Você colocou um tempo incorreto para a mensagem ser apagada!`, ephemeral: true })
                } else {
                    title2 = 0
                }


                configuracao.set('Entradas', {
                    msg: title,
                    tempo: title2,
                    channelid: arrayDeBancos,
                })

                await msgbemvindo(interaction, client)
            }


            if (interaction.customId === 'joaozinhompbanco') {
                const title2 = interaction.fields.getTextInputValue('tokenMP2');



                if (title2 !== ``) {
                    const stringSemEspacos = title2.replace(/\s/g, '');
                    const arrayDeBancos = stringSemEspacos.split(',');
                    configuracao.set(`pagamentos.BancosBloqueados`, arrayDeBancos)
                    const gfgfggfg = configuracao.get(`pagamentos.BancosBloqueados`)
                    var hhhh = ''
                    for (const key in gfgfggfg) {
                        const element = gfgfggfg[key];
                        hhhh += `${element}`;
                        if (key !== Object.keys(gfgfggfg)[Object.keys(gfgfggfg).length - 1]) {
                            hhhh += ', ';
                        }
                    }
                } else {
                    configuracao.set(`pagamentos.BancosBloqueados`, [])
                }

                FormasDePagamentos(interaction)

            }



            if (interaction.customId === 'tokenMP') {
                const tokenMP = interaction.fields.getTextInputValue('tokenMP');
                try {
                    const amount = 10; // Alterei o nome da variável e fiz o parsing direto

                    const payment_data = {
                        transaction_amount: parseFloat(amount), // Use a variável 'amount' aqui
                        description: 'Testando se o token é Válido | Node Applications',
                        payment_method_id: 'pix',
                        payer: { email: 'token-validation@users.invalid' },
                    };

                    mercadopago.configurations.setAccessToken(tokenMP);
                    await mercadopago.payment.create(payment_data);

                } catch (error) {
                    await interaction.reply({
                        content: `⚠️ | Access Token inválido!\n${error}\n\n> Tutorial para pegar o Access Token: [CliqueAqui](https://www.youtube.com/watch?v=w7kyGZUrkVY&feature=youtu.be)\n> Lembre-se de cadastrar uma chave pix na sua conta mercado pago!`,
                        ephemeral: true,
                    });
                    return;
                }

                //interaction.deferUpdate()
                FormasDePagamentos(interaction)
                configuracao.set(`pagamentos.MpAPI`, tokenMP);



            }
        }
    }
}
