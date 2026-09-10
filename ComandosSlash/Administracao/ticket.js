const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const data = new SlashCommandBuilder()
  .setName('ticket')
  .setDescription('Abre o painel de configuração do sistema de tickets')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild.toString());

module.exports = {
  name: 'ticket',
  description: 'Abre o painel de configuração do sistema de tickets',
  type: 1,
  data,
  run: async (_client, interaction) => {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild) && !interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: '❌ Você precisa de Gerenciar Servidor para abrir este painel.', ephemeral: true });
    }
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('🎫 Painel de configuração de tickets')
      .setDescription('Configure o sistema como no Ticket King. As alterações ficam salvas e não alteram o sistema de vendas.')
      .addFields(
        { name: 'Categoria e equipe', value: 'Defina onde os tickets serão criados e qual cargo será notificado.', inline: true },
        { name: 'Formulário', value: 'Configure o título e as perguntas antes da abertura.', inline: true },
        { name: 'Automação', value: 'Configure SLA, fechamento por inatividade e permissões.', inline: true }
      )
      .setFooter({ text: 'Shadow Games · Ticket Manager' });
    const rows = [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('ticket_admin_general').setLabel('Categoria e equipe').setEmoji('⚙️').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('ticket_admin_form').setLabel('Formulário').setEmoji('📝').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('ticket_admin_automation').setLabel('Automação').setEmoji('🤖').setStyle(ButtonStyle.Secondary)
      ),
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('ticket_admin_permissions').setLabel('Permissões').setEmoji('🔐').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('ticket_admin_publish').setLabel('Publicar painel').setEmoji('📌').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('ticket_admin_help').setLabel('Como usar').setEmoji('❓').setStyle(ButtonStyle.Secondary)
      )
    ];
    return interaction.reply({ embeds: [embed], components: rows, ephemeral: true });
  }
};
