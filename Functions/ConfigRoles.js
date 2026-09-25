const { EmbedBuilder, ApplicationCommandType, ActionRowBuilder, ButtonBuilder } = require("discord.js");
const { configuracao } = require("../DataBaseJson");


async function ConfigChannels(interaction, client) {

    const row2 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId("logpedidos")
                .setLabel('Definir canal de logs de pedidos')
                .setStyle(1),

            new ButtonBuilder()
                .setCustomId("eventbuy")
                .setLabel('Definir canal de evento de compras')
                .setEmoji(`1193429828188254208`)
                .setStyle(1),
        )
    const row3 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId("boasvindascoole")
                .setLabel('Definir canal de boas vindas')
                .setEmoji(`1193429904801406976`)
                .setStyle(1),

            new ButtonBuilder()
                .setCustomId("systemlogs")
                .setLabel('Definir canal de logs do sistema')
                .setEmoji(`1193429941841309707`)
                .setStyle(1),
        )

    const row5 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId("logentrada")
                .setLabel('Definir canal de logs de entradas')
                .setEmoji(`1191798324039258122`)
                .setStyle(1),

            new ButtonBuilder()
                .setCustomId("logsaida")
                .setLabel('Definir canal de logs de saídas')
                .setEmoji(`1191798275616018432`)
                .setStyle(1),
        )

    const row6 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId("logmensagem")
                .setLabel('Definir canal de logs de mensagens')
                .setEmoji(`1193430000200859698`)
                .setStyle(1),

            new ButtonBuilder()
                .setCustomId("trafegocall")
                .setLabel('Definir canal de logs de tráfego de call')
                .setEmoji(`1193430036993286264`)
                .setStyle(1),

            new ButtonBuilder()
                .setCustomId("feedback")
                .setLabel('Definir canal de logs de feedback')
                .setEmoji(`1193430061748080640`)
                .setStyle(1),

            new ButtonBuilder()
                .setCustomId("voltar2")
                .setLabel('Voltar')
                .setEmoji(`1178068047202893869`)
                .setStyle(2)
        )



    const embed = new EmbedBuilder()

        .setTitle('Configurar Canais')
        .setColor(`${configuracao.get(`Cores.Principal`) == null ? '0cd4cc' : configuracao.get('Cores.Principal')}`) //0cd4cc
        .setDescription(`
**Canal de log de pedidos:** ${configuracao.get(`ConfigChannels.logpedidos`) == null ? `Não definido` : `<#${configuracao.get(`ConfigChannels.logpedidos`)}>`}
**Canal de evento de compras:** ${configuracao.get(`ConfigChannels.eventbuy`) == null ? `Não definido` : `<#${configuracao.get(`ConfigChannels.eventbuy`)}>`}
**Canal de boas vindas:** ${configuracao.get(`ConfigChannels.boasvindascoole`) == null ? `Não definido` : `<#${configuracao.get(`ConfigChannels.boasvindascoole`)}>`}
**Canal de logs do sistema:** ${configuracao.get(`ConfigChannels.systemlogs`) == null ? `Não definido` : `<#${configuracao.get(`ConfigChannels.systemlogs`)}>`}
**Canal de logs de entradas:** ${configuracao.get(`ConfigChannels.entradas`) == null ? `Não definido` : `<#${configuracao.get(`ConfigChannels.entradas`)}>`}
**Canal de logs de saídas:** ${configuracao.get(`ConfigChannels.saídas`) == null ? `Não definido` : `<#${configuracao.get(`ConfigChannels.saídas`)}>`}
**Canal de logs de mensagens:** ${configuracao.get(`ConfigChannels.mensagens`) == null ? `Não definido` : `<#${configuracao.get(`ConfigChannels.mensagens`)}>`}
**Canal de logs de tráfego em call:** ${configuracao.get(`ConfigChannels.tráfego`) == null ? `Não definido` : `<#${configuracao.get(`ConfigChannels.tráfego`)}>`}
**Canal de feedback:** ${configuracao.get(`ConfigChannels.feedback`) == null ? `Não definido` : `<#${configuracao.get(`ConfigChannels.feedback`)}>`}
`)
        .setFooter(
            { text: interaction.guild.name, iconURL: interaction.guild.iconURL({ dynamic: true }) }
        )
        .setTimestamp()


    if (interaction.message == undefined) {
        interaction.reply({ content: ``, embeds: [embed], components: [row2, row3, row5, row6] })
    } else {
        interaction.update({ content: ``, embeds: [embed], components: [row2, row3, row5, row6] })
    }



}


async function ConfigRoles(interaction, client) {


    const row2 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId("definircargoadm")
                .setLabel('Definir cargo de Administrador')
                .setEmoji(`1178080366871973958`)
                .setStyle(1),

            new ButtonBuilder()
                .setCustomId("definircargosup")
                .setLabel('Definir cargo de Suporte')
                .setEmoji(`1178133970634948700`)
                .setStyle(1),
        )
    const row3 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId("roleclienteease")
                .setLabel('Definir cargo de Cliente')
                .setEmoji(`1178090605734273026`)
                .setStyle(1),

            new ButtonBuilder()
                .setCustomId("rolememberok")
                .setLabel('Definir cargo de membro')
                .setEmoji(`1178090724105920594`)
                .setStyle(1),
        )
    const row4 = new ActionRowBuilder()
        .addComponents(

            new ButtonBuilder()
                .setCustomId("voltar2")
                .setLabel('Voltar')
                .setEmoji(`1178068047202893869`)
                .setStyle(2)
        )


    const embed = new EmbedBuilder()

        .setTitle('Configurar cargos')
        .setColor(`${configuracao.get(`Cores.Principal`) == null ? '0cd4cc' : configuracao.get('Cores.Principal')}`)
        .setDescription(`
**Cargo de Administrador:** ${configuracao.get(`ConfigRoles.cargoadm`) == null ? `Não definido` : `<@&${configuracao.get(`ConfigRoles.cargoadm`)}>`}
**Cargo de Suporte:** ${configuracao.get(`ConfigRoles.cargosup`) == null ? `Não definido` : `<@&${configuracao.get(`ConfigRoles.cargosup`)}>`}
**Cargo de Cliente:** ${configuracao.get(`ConfigRoles.cargoCliente`) == null ? `Não definido` : `<@&${configuracao.get(`ConfigRoles.cargoCliente`)}>`}
**Cargo de Membro:** ${configuracao.get(`ConfigRoles.cargomembro`) == null ? `Não definido` : `<@&${configuracao.get(`ConfigRoles.cargomembro`)}>`}
    `)
        .setFooter(
            { text: interaction.guild.name, iconURL: interaction.guild.iconURL({ dynamic: true }) }
        )
        .setTimestamp()


    if (interaction.message == undefined) {
        interaction.reply({ content: ``, embeds: [embed], components: [row2, row3, row4] })
    } else {
        interaction.update({ content: ``, embeds: [embed], components: [row2, row3, row4] })
    }

}


module.exports = {
    ConfigRoles,
    ConfigChannels
}
