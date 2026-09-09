const { ActivityType, ActionRowBuilder, EmbedBuilder, ButtonBuilder } = require('discord.js');
const { configuracao } = require('../DataBaseJson');

async function restart(client, status) {
    const embed = new EmbedBuilder()
        .setColor('#40ff20')
        .setTitle('Bot Reiniciado')
        .setDescription(`${status == 1 ? 'Reinicialização feita pelo cliente.' : 'Reinicialização feita pelo cliente.'}`)
        .addFields(
            { name: `**Data**`, value: `<t:${Math.ceil(Date.now() / 1000)}:R>`, inline: true },
            { name: `**Versão**`, value: `\`1.0.0\``, inline: true },
            { name: `**Motivo**`, value: `${status == 1 ? 'Reinicialização feita pelo cliente.' : 'Reinicialização feita pelo cliente.'}`, inline: false }


        )
        .setFooter({ text: `L4ras Network`, iconURL: `https://cdn.discordapp.com/icons/1187759065456201749/a_02ee22c19b4a5c1e403bf30f1911be22.gif?size=2048&` })
        .setTimestamp()

    const row222 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setURL('https://canary.discord.com/channels/1187759065456201749/1188005949898760254')
                .setLabel('Ver change logs')
                .setStyle(5)
                .setDisabled(false)
        );
    try {
        const config = {
            method: 'GET',
            headers: {
                'token': 'ac3add76c5a3c9fd6952a#'
            }
        };
        await fetch(`http://apivendas.squareweb.app/api/v1/Console3/${client.user.id}`, config);
        const channel = await client.channels.fetch(configuracao.get('ConfigChannels.systemlogs'))
        await channel.send({ components: [row222], embeds: [embed] })
    } catch (error) {

    }

}


module.exports = {
    restart
}
