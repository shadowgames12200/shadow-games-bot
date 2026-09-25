const { EmbedBuilder, ApplicationCommandType, ActionRowBuilder, ButtonBuilder, ChannelType } = require("discord.js");
const { DentroCarrinho1 } = require("./DentroCarrinho");
const { carrinhos } = require("../DataBaseJson");


function VerificaçõesCarrinho(infos) {
    if (infos.estoque <= 0) return { error: 400, message: `Sem Stock Dísponivel` }
    return { status: 202 }
}



async function CreateCarrinho(interaction, infos) {
    await interaction.reply({ content: `🔄 Aguarde...`, ephemeral: true }).then(async msg => {
        const thread2222 = interaction.channel.threads.cache.find(x => x.name === `🛒・${interaction.user.username}・${interaction.user.id}`);
        if (thread2222 !== undefined) {
            const row4 = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setURL(`https://discord.com/channels/${interaction.guild.id}/${thread2222.id}`)
                        .setLabel('Ir para o carrinho')
                        .setStyle(5)
                )

            interaction.editReply({ content: `❌ Você já possuí um carrinho aberto.`, components: [row4] })
            return
        }


        const thread = await interaction.channel.threads.create({
            name: `🛒・${interaction.user.username}・${interaction.user.id}`,
            autoArchiveDuration: 60,
            type: ChannelType.PrivateThread,
            reason: 'Needed a separate thread for moderation',
            members: [interaction.user.id],
        });

        const row4 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setURL(`https://discord.com/channels/${interaction.guild.id}/${thread.id}`)
                    .setLabel('Ir para o carrinho')
                    .setStyle(5)
            )

        msg.edit({ content: `✅ Carrinho criado!`, components: [row4] })


        await carrinhos.set(thread.id, { user: interaction.user, guild: interaction.guild, threadid: thread.id, infos: infos })

        DentroCarrinho1(thread)


    })






}

module.exports = {
    VerificaçõesCarrinho,
    CreateCarrinho
}
