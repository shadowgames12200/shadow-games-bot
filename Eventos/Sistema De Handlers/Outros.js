const { InteractionType, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder, AttachmentBuilder, ButtonBuilder, ComponentType, ChannelSelectMenuBuilder, ChannelType, RoleSelectMenuBuilder, UserSelectMenuBuilder } = require("discord.js");

const { sugerir } = require("../../DataBaseJson");
const { QuickDB } = require("quick.db");
const db = new QuickDB();

module.exports = {
    name: 'interactionCreate',

    run: async (interaction, client) => {


        if (interaction.type == InteractionType.ModalSubmit) {


            if (interaction.customId === 'avaliacaogerallll') {
                const estrelas = interaction.fields.getTextInputValue('1');
                const desc = interaction.fields.getTextInputValue('2');


            }

        }
    }
}
