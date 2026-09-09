const { EmbedBuilder, ActionRowBuilder, ButtonBuilder } = require("discord.js")
const { configuracao } = require("../DataBaseJson")
const { EstatisticasNode } = require("../index.js")

function Posicao1(interaction, client) {

    const aa = configuracao.get(`posicoes`)

    const pos1 = aa?.pos1
    const pos2 = aa?.pos2
    const pos3 = aa?.pos3

    const embed = new EmbedBuilder()
        .setColor(`${configuracao.get(`Cores.Principal`) == null ? '0cd4cc': configuracao.get('Cores.Principal')}`)
        .setDescription(`As "posições" são cargos personalizáveis que você pode definir para que os clientes recebam quando gastam uma certa quantia no servidor.`)
        .addFields(
            { name: `Primeira Colocação`, value: `${pos1 == undefined ? `Não configurado` : `Recebe o cargo <@&${pos1.role}> após gastar \`R$ ${Number(pos1.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\`.`}` },
            { name: `Segunda Colocação`, value: `${pos2 == undefined ? `Não configurado` : `Recebe o cargo <@&${pos2.role}> após gastar \`R$ ${Number(pos2.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\`.`}` },
            { name: `Terceira Colocação`, value: `${pos3 == undefined ? `Não configurado` : `Recebe o cargo <@&${pos3.role}> após gastar \`R$ ${Number(pos3.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\`.`}` },

        )
        .setFooter(
            { text: interaction.guild.name, iconURL: interaction.guild.iconURL({ dynamic: true }) }
        )
        .setTimestamp()

    const row4 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId("Editarprimeiraposição")
                .setLabel('Editar primeira posição')
                .setEmoji(`1192563018547081369`)
                .setStyle(1),
            new ButtonBuilder()
                .setCustomId("Editarsegundaposição")
                .setLabel('Editar segunda posição')
                .setEmoji(`1192563056522309672`)
                .setStyle(1),
            new ButtonBuilder()
                .setCustomId("Editarterceiraposição")
                .setLabel('Editar terceira posição')
                .setEmoji(`1192563090726846464`)
                .setStyle(1),
            new ButtonBuilder()
                .setCustomId("voltar3")
                .setLabel('Voltar')
                .setEmoji(`1178068047202893869`)
                .setStyle(2)
        );

    interaction.update({ embeds: [embed], components: [row4] })

}


async function CheckPosition(client) {
    const aa = configuracao.get(`posicoes`)
    if (aa === null) return;
    const { pos1, pos2, pos3 } = aa ?? {};
    await Promise.all(client.guilds.cache.map(async (guild) => {
        await processPosition(pos1, guild);
        await processPosition(pos2, guild);
        await processPosition(pos3, guild);
    }));
    async function processPosition(pos, guild) {
        if (!pos) return;

        const role = guild.roles.cache.get(pos.role);
        const aa = await EstatisticasNode.GastouMais(null, Number(pos.valor));
        try {
            const members = await guild.members.fetch({ user: aa.map(user => user.userid) });

            for (const user of aa) {
                const member = members.get(user.userid);
                if (member && !member.roles.cache.has(role.id)) {
                    await member.roles.add(role.id).catch(() => {});
                }
            }
        } catch (error) {}
    }
}

module.exports = { Posicao1, CheckPosition }