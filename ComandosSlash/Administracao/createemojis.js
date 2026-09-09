const { EmbedBuilder, ApplicationCommandType, ActionRowBuilder, ButtonBuilder } = require("discord.js");
const { GerenciarCampos } = require("../../Functions/GerenciarCampos");
const { owner } = require("../../config.json");
const Discord = require("discord.js");
const axios = require('axios');
const { configuracao } = require("../../DataBaseJson/index.js");

module.exports = {
    name: "create_emojis",
    description: "Criar os emojis defaults",
    type: ApplicationCommandType.ChatInput,
    run: async (client, interaction, message) => {

        if (interaction.user.id !== owner) { return interaction.reply({ ephemeral: true, content: `❌ | Você não possui permissão para usar esse comando.` })}

        configuracao.set(`Emojis_EntregAbaixo`, [])
        configuracao.set(`Emojis_EntregAuto`, [])
        const emojiArray = [
            "https://cdn.discordapp.com/emojis/1183841001824067676.webp?size=96&quality=lossless",
            "https://cdn.discordapp.com/emojis/1183841127661580339.webp?size=96&quality=lossless",
            "https://cdn.discordapp.com/emojis/1183841205839220776.webp?size=96&quality=lossless",
            "https://cdn.discordapp.com/emojis/1183841312018026556.webp?size=96&quality=lossless",
            "https://cdn.discordapp.com/emojis/1183841529148739669.webp?size=96&quality=lossless",
            "https://cdn.discordapp.com/emojis/1183841627425476621.webp?size=96&quality=lossless",
            "https://cdn.discordapp.com/emojis/1183841719976996885.webp?size=96&quality=lossless",
            "https://cdn.discordapp.com/emojis/1183841795864535151.webp?size=96&quality=lossless",
            "https://cdn.discordapp.com/emojis/1183841842467446844.webp?size=96&quality=lossless"
        ]

        emojiArray.forEach(async (url, index) => {
            try {
                const emojiName = `eb${index + 1}`;
                const createdEmoji = await interaction.guild.emojis.create({ attachment: url, name: emojiName });
                await configuracao.push(`Emojis_EntregAbaixo`, { id: createdEmoji.id, name: createdEmoji.name });
            } catch (error) {
                console.log(error);
            }
        });


        const arrayVendasAuto = [
            "https://cdn.discordapp.com/emojis/1194131420499677317.webp?size=96&quality=lossless",
            "https://cdn.discordapp.com/emojis/1194131444797288549.webp?size=96&quality=lossless",
            "https://cdn.discordapp.com/emojis/1194131474534899753.webp?size=96&quality=lossless",
            "https://cdn.discordapp.com/emojis/1194131507858636961.webp?size=96&quality=lossless",
            "https://cdn.discordapp.com/emojis/1194131544764317736.webp?size=96&quality=lossless",
            "https://cdn.discordapp.com/emojis/1194131583767162960.webp?size=96&quality=lossless",
            "https://cdn.discordapp.com/emojis/1194131629812220005.webp?size=96&quality=lossless",
            "https://cdn.discordapp.com/emojis/1194131674196344922.webp?size=96&quality=lossless",
        ]

        arrayVendasAuto.forEach(async (url, index) => {
            try {
                const emojiName = `ea${index + 1}`;
                const createdEmoji = await interaction.guild.emojis.create({ attachment: url, name: emojiName });
                await configuracao.push(`Emojis_EntregAuto`, { id: createdEmoji.id, name: createdEmoji.name });
            } catch (error) {
                console.log(error)
            }
        });

        await interaction.reply(`Successfully!`);
    },
};
