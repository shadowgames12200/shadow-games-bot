const { ButtonBuilder, ActionRowBuilder, EmbedBuilder } = require("discord.js")
const { tickets } = require("../DataBaseJson")

async function painelTicket(interaction) {
    const embed = new EmbedBuilder()
        .setFooter(
            { text: interaction.guild.name, iconURL: interaction.guild.iconURL({ dynamic: true }) }
        )
        .setTimestamp()


    if (tickets.get(`tickets.aparencia.title`) !== null) {
        embed.setTitle(tickets.get(`tickets.aparencia.title`))
    }
    if (tickets.get(`tickets.aparencia.description`) !== null) {
        embed.setDescription(tickets.get(`tickets.aparencia.description`))
    }
    if (tickets.get(`tickets.aparencia.color`) !== null) {
        embed.setColor(tickets.get(`tickets.aparencia.color`))
    }
    if (tickets.get(`tickets.aparencia.banner`) !== null) {
        embed.setImage(tickets.get(`tickets.aparencia.banner`))
    }

    const funcoes = tickets.get(`tickets.funcoes`);

    if(funcoes !== null){

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

    await interaction.update({ content: ``, embeds: [embed], components: [row2, row3, row4] })
}


module.exports = {
    painelTicket
}