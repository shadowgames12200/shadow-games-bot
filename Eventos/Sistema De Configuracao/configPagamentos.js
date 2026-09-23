const { ActionRowBuilder, TextInputBuilder, TextInputStyle, InteractionType, ModalBuilder, EmbedBuilder, ButtonBuilder } = require("discord.js");
const { configuracao } = require("../../DataBaseJson");
const { Gerenciar } = require("../../Functions/Gerenciar");
const { FormasDePagamentos } = require("../../Functions/FormasDePagamentosConfig");
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



            if (interaction.customId == '+18porra' || interaction.customId == '-18porra' || interaction.customId == 'configurarmercadopago') {
                return interaction.reply({ content: '❌ Mercado Pago foi desativado. Configure e use somente o Asaas.', ephemeral: true });
            }

            if (interaction.customId === 'voltaradawdwa') {
                Gerenciar(interaction, client)
            }
            if (interaction.customId === 'formasdepagamentos') {
                FormasDePagamentos(interaction)

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



        }
    }
}
