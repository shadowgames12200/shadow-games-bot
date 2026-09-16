const {
  ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder,
  EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ChannelType,
  PermissionFlagsBits
} = require('discord.js');
const { configuracao, tickets, estatisticas } = require('../DataBaseJson');




const aberturaCooldown = new Map();
const FORM_PREFIX = 'ticket_open_form_';




function normalize(value) { return String(value || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim(); }
function isSupportType(value) {
  const text = normalize(value);
  return text === 'suporte ao cliente';
}
function formKind(value) { return isSupportType(value) ? 'support' : 'doubt'; }
function formCustomId(value) { return `${FORM_PREFIX}${formKind(value)}`; }




function openForm(valor) {
  const support = formKind(valor) === 'support';
  const modal = new ModalBuilder().setCustomId(formCustomId(valor)).setTitle(support ? 'Suporte ao Cliente' : 'Dúvidas');
  const fields = support ? [
    ['ticket_customer', 'Nome', 'Informe seu nome ou usuário', true],
    ['ticket_order', 'Nome ou ID do produto', 'Ex.: 123456 ou Plano de jogos', true],
    ['ticket_description', 'Descrição', 'Explique detalhadamente o que aconteceu', true]
  ] : [
    ['ticket_customer', 'Nome do cliente ou usuário', 'Informe seu nome ou usuário', true],
    ['ticket_description', 'Descrição', 'Escreva sua dúvida', true]
  ];
  modal.addComponents(fields.map(([id, label, placeholder, required]) => new ActionRowBuilder().addComponents(
    new TextInputBuilder().setCustomId(id).setLabel(label).setPlaceholder(placeholder).setStyle(id === 'ticket_description' ? TextInputStyle.Paragraph : TextInputStyle.Short).setRequired(required).setMaxLength(id === 'ticket_description' ? 1000 : 100)
  )));
  return modal;
}




async function CreateTicket(interaction, valor) {
  if (!interaction.isButton?.() || !String(interaction.customId || '').startsWith('AbrirTicket_')) return false;
  await interaction.showModal(openForm(valor || String(interaction.customId).replace('AbrirTicket_', '')));
  return true;
}




function valueOf(fields, id) { return fields.getTextInputValue(id).trim(); }
function purchaseList(userId, guildId) {
  return estatisticas.fetchAll().map(item => ({ key: item.ID, ...item.data })).filter(item => String(item.userid) === String(userId) && (!item.guildid || String(item.guildid) === String(guildId))).slice(0, 25);
}
function purchasePanel(userId, guildId) {
  const list = purchaseList(userId, guildId);
  if (!list.length) return [];
  const menu = new StringSelectMenuBuilder()
    .setCustomId('ticket_purchase_link')
    .setPlaceholder('Selecionar compra')
    .addOptions(list.map((p, i) => ({
      value: String(p.key),
      label: `${i + 1}. ${String(p.produto || 'Produto').slice(0, 80)}`,
      description: `Pedido ${p.idpagamento || p.key}`.slice(0, 100)
    })));
  return [new ActionRowBuilder().addComponents(menu)];
}




function clientPanel(isSupport, userId, guildId) {
  const options = new StringSelectMenuBuilder().setCustomId('ticket_client_options').setPlaceholder('Opções');
  options.addOptions(
    { label: 'Informar pagamento', description: 'Avisar a equipe sobre um pagamento', value: 'payment', emoji: '💳' },
    { label: 'Atualização do pedido', description: 'Solicitar atualização do atendimento', value: 'update', emoji: '📦' },
    { label: 'Enviar outra informação', description: 'Adicionar uma informação no ticket', value: 'info', emoji: '📝' },
    { label: 'Adicionar membro', description: 'Solicitar a entrada de outra pessoa', value: 'add_member', emoji: '👤' }
  );
  const rows = [new ActionRowBuilder().addComponents(options)];
  if (isSupport) rows.push(...purchasePanel(userId, guildId));
