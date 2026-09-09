const { ActionRowBuilder, EmbedBuilder, ButtonBuilder } = require('discord.js');
const { configuracao, estatisticas, } = require('../DataBaseJson');
const axios = require('axios');
const { JsonDatabase } = require('wio.db');


async function Varredura(client) {

    if (configuracao.get('ConfigChannels.systemlogs') == null) return;
	    if (!(process.env.MP_ACCESS_TOKEN || configuracao.get('pagamentos.MpAPI'))) return;

    const embed3 = new EmbedBuilder()
        .setColor('#1c44ff')
        .setTitle(`🚨 Varredura Anti-Fraude`)
        .setDescription(`O bot da Wolf Store está realizando uma varredura matinal nos pagamentos para verificar a existência de quaisquer reembolsos suspeitos.`)
        .setFooter({ iconURL: `https://media.discordapp.net/attachments/1326580051205947513/1329584298533064754/Wolf_Store_-_LOGOTIPO.jpg`, text: `Sistema Anti-Fraude - Wolf Applications.` })
        .setTimestamp();

    const row222 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('asSs')
                .setLabel('Mensagem do Sistema')
                .setStyle(2)
                .setDisabled(true)
        );

    const channel = await client.channels.fetch(configuracao.get('ConfigChannels.systemlogs'));
    await channel.send({ components: [row222], embeds: [embed3] });

    const refundResponse = await axios.get('https://api.mercadopago.com/v1/payments/search', {
        params: {
            'access_token': `${process.env.MP_ACCESS_TOKEN || configuracao.get('pagamentos.MpAPI')}`,
            'status': 'refunded'
        }
    });

    const dd = refundResponse.data.results;


    const refounds = new JsonDatabase({
        databasePath: "./DataBaseJson/refounds.json"
    });


    for (const element of dd) {
        const isRefunded = await refounds.get(`${element.id}`);

        if (!isRefunded) {
            await refounds.set(`${element.id}`, `Reembolsado`);

            let id = await element.external_reference
            if (element.external_reference == null) {
                id = 'Não encontrado'
            }


            try {
                await channel.send({ components: [row222], embeds: [embed] });
            } catch (error) {
                console.error('Erro ao enviar a mensagem:', error);
            }

            const estatisticasData = estatisticas.fetchAll();
            for (const element2 of estatisticasData) {
                if (element2.data.idpagamento === element.id) {
                    estatisticas.delete(element2.ID);
                }
            }
        }
    }
}



module.exports = {
    Varredura
};
