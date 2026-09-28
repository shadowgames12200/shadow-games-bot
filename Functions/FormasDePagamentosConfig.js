const { ActionRowBuilder, EmbedBuilder, ButtonBuilder, StringSelectMenuBuilder, ButtonStyle } = require("discord.js");
const { configuracao } = require("../DataBaseJson");

const PROVIDER_OPTIONS = [
  { label: 'Efí Bank · Sandbox/Teste', value: 'efi:sandbox', description: 'Homologação; não usa dinheiro real' },
  { label: 'Efí Bank · Produção', value: 'efi:production', description: 'Cobranças reais na conta Efí' },
  { label: 'Asaas · Sandbox/Teste', value: 'asaas:sandbox', description: 'Ambiente de testes do Asaas' },
  { label: 'Asaas · Produção', value: 'asaas:production', description: 'Cobranças reais no Asaas' }
];

async function FormasDePagamentos(interaction) {
  const bloqueados = configuracao.get('pagamentos.BancosBloqueados') || [];
  const bancosBloqueados = bloqueados.length ? bloqueados.map(banco => `\`${banco}\``).join('\n') : 'Nenhum';
  const paymentProviders = require('../PaymentProviders');
  const status = paymentProviders.status();
  const selectedValue = status.provider ? `${status.provider}:${status.mode}` : null;
  const selectedLabel = status.provider
    ? `${status.name} · ${status.mode === 'production' ? 'Produção' : 'Sandbox/Teste'}`
    : 'Nenhum provedor selecionado';
  const credentialsLabel = status.configured ? 'credenciais encontradas' : 'credenciais pendentes';

  const embed = new EmbedBuilder()
    .setTitle('Configurar formas de pagamento')
    .setDescription([
      `**Provedor ativo:** ${selectedLabel}`,
      status.provider ? `**Configuração:** ${credentialsLabel}` : 'Selecione um provedor e ambiente no menu abaixo.',
      '',
      'Para Efí, cadastre Client ID, Client Secret, chave Pix e certificado como variáveis/secrets no Render. **Não digite credenciais ou certificados no Discord.**'
    ].join('\n'))
    .setFields(
      { name: 'Efí Bank', value: status.provider === 'efi' ? `Selecionado (${status.mode === 'production' ? 'Produção' : 'Sandbox/Teste'}) · ${credentialsLabel}` : 'Disponível para Pix' },
      { name: 'Asaas', value: status.provider === 'asaas' ? `Selecionado (${status.mode === 'production' ? 'Produção' : 'Sandbox/Teste'}) · ${credentialsLabel}` : 'Disponível' },
      { name: 'Bancos bloqueados', value: bancosBloqueados }
    )
    .setColor(configuracao.get('Cores.Principal') || '0cd4cc')
    .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL({ dynamic: true }) })
    .setTimestamp();

  if (status.provider === 'efi' && !status.configured) {
    embed.addFields({ name: 'Ação necessária', value: 'Adicione os secrets da Efí no Render e reimplante o bot. A seleção sandbox pode ser salva antes disso, mas cobranças não funcionarão até a configuração estar completa.' });
  }

  if (configuracao.get('pagamentos.SemiAutomatico.status') === true) {
    embed.addFields({ name: 'Pagamento manual ativado', value: String(configuracao.get('pagamentos.SemiAutomatico.msg') || 'Configurado') });
  }

  const providerMenu = new StringSelectMenuBuilder()
    .setCustomId('payment_provider_select')
    .setPlaceholder('Selecionar provedor e ambiente')
    .setMinValues(1)
    .setMaxValues(1)
    .addOptions(PROVIDER_OPTIONS.map(option => ({ ...option, default: option.value === selectedValue })));
  const providerRow = new ActionRowBuilder().addComponents(providerMenu);

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('ajudaefi')
      .setLabel('Como configurar Efí')
      .setEmoji('🏦')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('configurarasaas')
      .setLabel('Configurar Asaas')
      .setEmoji('💠')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('formasdepagamentos')
      .setLabel('Editar endereços de Crypto')
      .setEmoji('⚙️')
      .setStyle(ButtonStyle.Primary)
  );
  const row3 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('voltaradawdwa')
      .setLabel('Voltar')
      .setEmoji('⬅️')
      .setStyle(ButtonStyle.Secondary)
  );
  const row4 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('ConfigurarPagamentoManual')
      .setLabel('Configurar Pagamento Manual')
      .setEmoji('🧾')
      .setStyle(ButtonStyle.Primary)
  );

  return interaction.update({ content: '', embeds: [embed], ephemeral: true, components: [providerRow, row2, row4, row3] });
}

module.exports = { FormasDePagamentos, PROVIDER_OPTIONS };
