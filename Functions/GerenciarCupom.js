const { EmbedBuilder, ActionRowBuilder, ButtonBuilder } = require("discord.js")
const { produtos, configuracao } = require("../DataBaseJson")
const { QuickDB } = require("quick.db");
const db = new QuickDB();
const axios = require('axios');

async function GerenciarCupom(interaction, produtoname, ggg222) {



    const ggg = produtos.get(produtoname)


    db.set(interaction.message.id, { name: produtoname })

    var campos = ''
    if (ggg.Campos.length === 0) {
        campos = 'Nenhum campo adicionado';
    } else {
        for (let i = ggg.Campos.length - 1; i >= Math.max(0, ggg.Campos.length - 5); i--) {
            const campooo = ggg.Campos[i];
            campos += `- Nome: \`${campooo.Nome}\` Estoque: \`${campooo.estoque.length}\` Valor: \`R$ ${Number(campooo.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\`\n`;
        }

        if (ggg.Campos.length > 5) {
            campos += `E mais ${ggg.Campos.length - 5}...`;
        }
    }






    var cupom = ''
    if (ggg.Cupom.length === 0) {
        cupom = 'Nenhum cupom';
    } else {
        for (let i = ggg.Cupom.length - 1; i >= Math.max(0, ggg.Cupom.length - 3); i--) {
            const cupommmm = ggg.Cupom[i];


            const a1 = cupommmm.condicoes?.cargospodeusar ? `Possuí o cargo <@&${cupommmm.condicoes?.cargospodeusar}>` : '';
            const a2 = cupommmm.condicoes?.precominimo ? `Comprar no mínimo \`${cupommmm.condicoes?.precominimo}\` unidades` : '';
            const a3 = cupommmm.condicoes?.qtdmaxima ? `Comprar no máximo \`${cupommmm.condicoes?.qtdmaxima}\` unidades` : '';

            const a4 = !cupommmm.condicoes?.cargospodeusar && !cupommmm.condicoes?.precominimo && !cupommmm.condicoes?.qtdmaxima;
            const condicaoInfoValue = `${a1}${a2 && (a1 || a3) ? ',' : ''}${a2}${a3 && (a2 || a1) ? ',' : ''}${a3 || ''}`;


            cupom += `- Código: \`${cupommmm.Nome}\` Quantidade: \`${cupommmm.qtd == undefined ? `Ilimitado` : cupommmm.qtd}\` Desconto: \`${cupommmm.desconto}%\` Max. Usos: \`${cupommmm.maxuse == undefined ? `Ilimitado` : cupommmm.maxuse}\` Validade: \`${cupommmm.diasvalidos2 == undefined ? `Não expira` : cupommmm.diasvalidos2}\` N. Usos: \`${cupommmm.usos}\` Condições: ${a4 ? 'Não Definido' : condicaoInfoValue}\n`;
        }

        if (ggg.Cupom.length > 3) {
            cupom += `E mais ${ggg.Cupom.length - 3}...`;
        }
    }








    const embed = new EmbedBuilder()
        .setAuthor({ iconURL: interaction.guild.iconURL({ dynamic: true }), name: `${ggg.Config.name}` })
        .setTitle('Detalhes')
        .addFields(
            { name: `Campos`, value: `${campos}` },
            { name: `Cupons`, value: `${cupom}` },
            { name: `Entrega automática`, value: `${ggg.Config.entrega}` },
        )
        .setFooter(
            { text: interaction.guild.name, iconURL: interaction.guild.iconURL({ dynamic: true }) }
        )
        .setTimestamp()
        .setColor(`${configuracao.get(`Cores.Principal`) == null ? '0cd4cc': configuracao.get('Cores.Principal')}`)




    const row2 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId("addcupom")
                .setLabel('Adicionar cupom')
                .setEmoji(`1178067873894236311`)
                .setStyle(3),

            new ButtonBuilder()
                .setCustomId("remcupom")
                .setLabel('Remover cupom')
                .setEmoji(`1178076767567757312`)
                .setStyle(4),



        )
    const row3 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId("voltargerenciarproduto")
                .setLabel('Voltar')
                .setEmoji(`1178068047202893869`)
                .setStyle(2),


        )






    if (ggg222 == undefined) {
        await interaction.update({ components: [row2, row3], embeds: [embed], content: ``, fetchReply: true })
    } else {
        await axios.patch(`https://discord.com/api/webhooks/${ggg222.applicationid}/${ggg222.webhookID}/messages/${ggg222.msgid}`, {
            flags: 64,
            components: [row2],
            embeds: [embed]
        });
    }


}

module.exports = {
    GerenciarCupom
}