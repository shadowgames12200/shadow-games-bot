const { ButtonBuilder, ActionRowBuilder, EmbedBuilder, ChannelSelectMenuBuilder, ChannelType } = require("discord.js")
const { tickets, configuracao } = require("../DataBaseJson")

async function painelTicket(interaction) {
    const embed = new EmbedBuilder()
        .setFooter(
            { text: interaction.guild.name, iconURL: interaction.guild.iconURL({ dynamic: true }) }
        )
        .setTimestamp()


    const title = tickets.get(`tickets.aparencia.title`);
    if (typeof title === 'string' && title.trim().length > 0 && title.length <= 256) {
        embed.setTitle(title);
    }

    const description = tickets.get(`tickets.aparencia.description`);
    if (typeof description === 'string' && description.trim().length > 0 && description.length <= 4096) {
        embed.setDescription(description);
    }

    const color = tickets.get(`tickets.aparencia.color`);
    if (typeof color === 'number' && Number.isInteger(color) && color >= 0 && color <= 0xffffff) {
        embed.setColor(color);
    } else if (typeof color === 'string' && /^#?(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(color.trim())) {
        embed.setColor(color.trim());
    }

    const banner = tickets.get(`tickets.aparencia.banner`);
    if (typeof banner === 'string' && /^https?:\/\/\S+$/i.test(banner.trim())) {
        embed.setImage(banner.trim());
    }

    const staffConfig = tickets.get('tickets.staffConfig') || {};
    const transcriptChannelId = staffConfig.transcriptChannelId !== undefined
        ? staffConfig.transcriptChannelId
        : (configuracao.get('ConfigChannels.logpedidos') || configuracao.get('ConfigChannels.eventbuy') || '');
    embed.addFields(
        { name: '📣 Log de abertura', value: staffConfig.logChannelId ? `<#${staffConfig.logChannelId}>` : 'Não configurado.' },
        { name: '📄 Canal do transcript HTML', value: transcriptChannelId ? `<#${transcriptChannelId}>` : 'Não configurado.' },
    );

    const funcoes = tickets.get(`tickets.funcoes`);

    if (funcoes && typeof funcoes === 'object') {

    let count = 0;
    let maxItems = 4;
    for (const chave in funcoes) {
        if (count >= maxItems) {
            break;
        }

        const objetoAtual = funcoes[chave];

        const nome = objetoAtual.nome;
        const predescricao = objetoAtual.predescricao;
        const descricao = objetoAtual.descricao;
        const emoji = objetoAtual.emoji;

        embed.addFields({ name: `**${nome}**`, value: `**Pré descrição:** \`${predescricao}\`\n**Emoji:** ${emoji == undefined ? `Não definido.` : emoji}\n**Descrição:**\n${descricao == undefined ? `Não definido, será enviado o principal.` : descricao}\n\n` });

        count++;
    }

    // Adiciona mensagem indicando mais itens se necessário

        if (Object.keys(funcoes).length > maxItems) {
            const maisItens = `Mais ${Object.keys(funcoes).length - maxItems} item${Object.keys(funcoes).length - maxItems > 1 ? 's' : ''}...`;
            embed.addFields({ name: '\u200B', value: maisItens });
        }


}
    // const descricaoInicial = arrayString.slice(0, 4).join('');
    // embed.setDescription(descricaoInicial);

    // // Adicione uma mensagem indicando que há mais itens
    // if (arrayString.length > 4) {
    //     const maisItens = `Mais ${arrayString.length - 4} item${arrayString.length - 4 > 1 ? 's' : ''}...`;
    //     embed.setDescription(`${descricaoInicial}\n${maisItens}`);
    // }



    const row2 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId("definiraparencia")
                .setLabel('Definir aparência')
                .setEmoji(`1178066208835252266`)
                .setStyle(1),


        )

    const row3 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId("addfuncaoticket")
                .setLabel('Adicionar função')
                .setEmoji(`1178076508150059019`)
                .setStyle(3),

            new ButtonBuilder()
                .setCustomId("remfuncaoticket")
                .setLabel('Remover função')
                .setEmoji(`1178076767567757312`)
                .setStyle(4),

        )

    const rowLogChannel = new ActionRowBuilder()
        .addComponents(
            new ChannelSelectMenuBuilder()
                .setCustomId('ticket_log_channel_select')
                .setPlaceholder('Selecionar canal para logs de abertura')
                .setChannelTypes(ChannelType.GuildText)
                .setMinValues(1)
                .setMaxValues(1)
        );

    const rowTranscriptChannel = new ActionRowBuilder()
        .addComponents(
            new ChannelSelectMenuBuilder()
                .setCustomId('ticket_transcript_channel_select')
                .setPlaceholder('Selecionar canal para transcripts HTML')
                .setChannelTypes(ChannelType.GuildText)
                .setMinValues(1)
                .setMaxValues(1)
        );

    const row4 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId("postarticket")
                .setLabel('Postar')
                .setEmoji(`1178076954029731930`)
                .setStyle(1),

            new ButtonBuilder()
                .setCustomId("sincronizarticket")
                .setLabel('Sincronizar')
                .setEmoji(`1178077123882262628`)
                .setStyle(2),

            new ButtonBuilder()
                .setCustomId("voltar1")
                .setLabel('Voltar')
                .setEmoji(`1178068047202893869`)
                .setStyle(2)
        )

    await interaction.update({ content: ``, embeds: [embed], components: [row2, row3, rowLogChannel, rowTranscriptChannel, row4] })
}


module.exports = {
    painelTicket
}
