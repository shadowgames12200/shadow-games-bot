const { InteractionType, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder, AttachmentBuilder, ButtonBuilder, ComponentType, ChannelSelectMenuBuilder, ChannelType, RoleSelectMenuBuilder, UserSelectMenuBuilder } = require("discord.js");

const { sugerir, avaliacoes, configuracao } = require("../../DataBaseJson");
const { QuickDB } = require("quick.db");
const db = new QuickDB();

module.exports = {
    name: 'interactionCreate',

    run: async (interaction, client) => {

        if (interaction.isButton() && interaction.customId.startsWith('avaliar_')) {
            const [, estrelas, pedido] = interaction.customId.split('_');
            const modal = new ModalBuilder()
                .setCustomId(`avaliartexto_${estrelas}_${pedido}`)
                .setTitle(`Avaliação: ${estrelas}/5 estrelas`);
            const comentario = new TextInputBuilder()
                .setCustomId('comentario')
                .setLabel('Comentário (opcional)')
                .setPlaceholder('Conte como foi sua experiência com a Shadow Games')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(false)
                .setMaxLength(1000);
            modal.addComponents(new ActionRowBuilder().addComponents(comentario));
            return interaction.showModal(modal);
        }


        if (interaction.type == InteractionType.ModalSubmit) {


            if (interaction.customId === 'avaliacaogerallll') {
                const estrelas = interaction.fields.getTextInputValue('1');
                const desc = interaction.fields.getTextInputValue('2');

              
            }

            if (interaction.customId.startsWith('avaliartexto_')) {
                const [, estrelas, pedido] = interaction.customId.split('_');
                const comentario = interaction.fields.getTextInputValue('comentario') || 'Sem comentário';
                const registro = {
                    userid: interaction.user.id,
                    username: interaction.user.tag,
                    estrelas: Number(estrelas),
                    pedido,
                    comentario,
                    data: Date.now()
                };
                avaliacoes.set(`${interaction.user.id}_${Date.now()}`, registro);
                await interaction.reply({ content: `✅ | Obrigado pela avaliação de ${estrelas}/5 estrelas!`, ephemeral: true });

                const canalId = configuracao.get('ConfigChannels.feedback');
                if (canalId) {
                    try {
                        const canal = await client.channels.fetch(canalId);
                        await canal.send({ embeds: [new EmbedBuilder()
                            .setColor(configuracao.get('Cores.Principal') || '#9400D3')
                            .setTitle('⭐ Nova avaliação')
                            .setDescription(comentario)
                            .addFields(
                                { name: 'Cliente', value: `<@${interaction.user.id}>`, inline: true },
                                { name: 'Nota', value: `${'⭐'.repeat(Number(estrelas))} (${estrelas}/5)`, inline: true },
                                { name: 'Pedido', value: String(pedido) }
                            )
                            .setTimestamp()] });
                    } catch (error) { }
                }
            }

        }
    }
}
