const { EmbedBuilder, ApplicationCommandType, ActionRowBuilder, ButtonBuilder } = require("discord.js");
const Discord = require("discord.js");
const { MessageStock } = require("../../Functions/ConfigEstoque.js");
const { produtos } = require("../../DataBaseJson");
const { owner } = require("../../config.json");

module.exports = {
    name: "remove_mass_coupon",
    description: "Use para configurar minhas funções",
    type: ApplicationCommandType.ChatInput,
    options: [
        {
            name: "name",
            description: "-",
            type: Discord.ApplicationCommandOptionType.String,
            required: true,
        },
    ],

    run: async (client, interaction, message) => {
        if (interaction.user.id !== owner) { return interaction.reply({ ephemeral: true, content: `❌ | Você não possui permissão para usar esse comando.` }) }

        const nome = interaction.options.getString("name");

        const dd = produtos.fetchAll();
        const clientesComCupom = [];
        const clientesSemCupom = [];

        dd.forEach((cliente) => {
            const indexCupom = cliente.data.Cupom.findIndex((cupom) => cupom.Nome === nome);

            if (indexCupom !== -1) {
                cliente.data.Cupom.splice(indexCupom, 1);
                clientesComCupom.push(cliente.ID);
            } else {
                clientesSemCupom.push(cliente.ID);
            }
        });

        dd.forEach((cliente) => {
            produtos.set(`${cliente.ID}.Cupom`, cliente.data.Cupom);
        });

        const primeiroErro = clientesSemCupom.slice(0, 10).join("\n");
        const restanteErro = clientesSemCupom.length > 10 ? `\n... e mais ${clientesSemCupom.length - 10} produtos` : "";

        interaction.reply({
            content: `O cupom \`${nome}\` foi removido com sucesso em \`${clientesComCupom.length}\` produtos, e falhou nos produtos abaixo:\n\nTambém não foi encontrado nos produtos abaixo:\n\`${primeiroErro}${restanteErro}\``,
            ephemeral: true,
        })
    },
};
