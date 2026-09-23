const { ActionRowBuilder, EmbedBuilder, ButtonBuilder } = require("discord.js");
const { configuracao } = require("../DataBaseJson");

async function FormasDePagamentos(interaction) {
  const bloqueados = configuracao.get('pagamentos.BancosBloqueados') || [];
  const bancosBloqueados = bloqueados.length ? bloqueados.map(banco => `\`${banco}\``).join('\n') : 'Nenhum';
  const paymentProviders = require('../PaymentProviders');
  const status = paymentProviders.status();

  const embed = new EmbedBuilder()
    .setTitle('Configurar formas de pagamento')
    .setFields(
      { name: 'Asaas', value: status.provider === 'asaas' ? `Selecionado (${status.mode})` : 'Não selecionado' },
      { name: 'Bancos bloqueados', value: bancosBloqueados }
    )
    .setColor(configuracao.get('Cores.Principal') || '0cd4cc')
    .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL({ dynamic: true }) })
    .setTimestamp();

  if (configuracao.get('pagamentos.SemiAutomatico.status') === true) {
    embed.addFields({ name: 'Pagamento manual ativado', value: String(configuracao.get('pagamentos.SemiAutomatico.msg') || 'Configurado') });
  }

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('configurarasaas')
      .setLabel('Configurar Asaas')
      .setEmoji('💠')
      .setStyle(1),
    new ButtonBuilder()
      .setCustomId('formasdepagamentos')
      .setLabel('Editar endereços de Crypto')
      .setEmoji('⚙️')
      .setStyle(1)
  );
  const row3 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('voltaradawdwa')
      .setLabel('Voltar')
      .setEmoji('⬅️')
      .setStyle(2)
  );
  const row4 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('ConfigurarPagamentoManual')
      .setLabel('Configurar Pagamento Manual')
      .setEmoji('🧾')
      .setStyle(1)
  );

  return interaction.update({ content: '', embeds: [embed], ephemeral: true, components: [row2, row4, row3] });
}

module.exports = { FormasDePagamentos };
