const {
  ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder,
  EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ChannelType,
  PermissionFlagsBits
} = require('discord.js');
const { configuracao, tickets, estatisticas } = require('../DataBaseJson');

const aberturaCooldown = new Map();
const FORM_PREFIX = 'ticket_open_form_';

function normalize(value) { return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); }
function isSupportType(value) {
  const text = normalize(value);
  return text === 'suporte ao cliente';
}
function formKind(value) { return isSupportType(value) ? 'support' : 'doubt'; }
function formCustomId(value) { return `${FORM_PREFIX}${formKind(value)}`; }

function openForm(valor) {
  const functions = tickets.get('tickets.funcoes') || {};
  const entry = functions[valor] ? [valor, functions[valor]] : Object.entries(functions).find(([key, item]) => String(item?.nome || key).trim() === String(valor).trim());
  const resolvedName = entry?.[1]?.nome || entry?.[0] || valor;
  const support = isSupportType(resolvedName);
  const modal = new ModalBuilder().setCustomId(formCustomId(resolvedName)).setTitle(support ? 'Suporte ao Cliente' : 'Dúvidas');
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
  const isButton = interaction.isButton?.() && String(interaction.customId || '').startsWith('AbrirTicket_');
  const isSelect = (interaction.isStringSelectMenu?.() || interaction.isSelectMenu?.()) && (interaction.customId === 'abrirticket' || interaction.customId === 'ticket_public_options');
  if (!isButton && !isSelect) return false;
  const rawValue = String(valor || (isSelect ? interaction.values?.[0] : String(interaction.customId).replace('AbrirTicket_', '')) || '').trim();
  const functions = tickets.get('tickets.funcoes') || {};
  const entry = functions[rawValue] ? [rawValue, functions[rawValue]] : Object.entries(functions).find(([key, item]) => String(item?.nome || key).trim() === rawValue);
  const resolvedKey = entry?.[0] || rawValue;
  const ggg = entry?.[1] || tickets.get(`tickets.funcoes.${rawValue}`);
  if (!ggg || !Object.keys(ggg).length) return interaction.reply({ content: '❌ | Essa função não existe!', ephemeral: true });
  const support = isSupportType(ggg.nome || resolvedKey);
  const last = aberturaCooldown.get(interaction.user.id) || 0;
  if (Date.now() - last < 30000) return interaction.reply({ content: '⏳ | Aguarde alguns segundos antes de abrir outro ticket.', ephemeral: true });
  aberturaCooldown.set(interaction.user.id, Date.now());
  await interaction.reply({ content: '🔄 | Aguarde estamos criando seu Ticket!', ephemeral: true });
  const existing = interaction.channel.threads.cache.find(x => x.name.includes(interaction.user.id));
  if (existing) {
    const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setURL(`https://discord.com/channels/${interaction.guild.id}/${existing.id}`).setLabel('Ir para o Ticket').setStyle(ButtonStyle.Link));
    return interaction.editReply({ content: '❌ Você já possuí um ticket aberto.', components: [row] });
  }
  const thread = await interaction.channel.threads.create({
    name: `${rawValue}・${interaction.user.username}・${interaction.user.id}`,
    autoArchiveDuration: 60,
    type: ChannelType.PrivateThread,
    reason: 'Ticket aberto',
    members: [interaction.user.id],
    permissionOverwrites: [
      { id: configuracao.get('ConfigRoles.cargoadm'), allow: [PermissionFlagsBits.SendMessagesInThreads] },
      { id: configuracao.get('ConfigRoles.cargosup'), allow: [PermissionFlagsBits.SendMessagesInThreads] },
      { id: interaction.user.id, allow: [PermissionFlagsBits.SendMessagesInThreads] }
    ]
  });
  const rowLink = new ActionRowBuilder().addComponents(new ButtonBuilder().setURL(`https://discord.com/channels/${interaction.guild.id}/${thread.id}`).setLabel('Ir para o Ticket').setStyle(ButtonStyle.Link));
  await interaction.editReply({ content: '✅ Ticket criado com sucesso!', components: [rowLink] });
  const appearance = tickets.get('tickets.aparencia') || {};
  const embed = new EmbedBuilder()
    .setAuthor({ name: interaction.user.username, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
    .setTitle(ggg.nome || rawValue)
    .setDescription(ggg.descricao === undefined ? (ggg.predescricao || 'Atendimento') : ggg.descricao)
    .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL({ dynamic: true }) })
    .setTimestamp();
  if (ggg.banner) embed.setImage(ggg.banner);
  if (appearance.color) embed.setColor(appearance.color);
  const mention = `${interaction.user} ${configuracao.get('ConfigRoles.cargoadm') ? `<@&${configuracao.get('ConfigRoles.cargoadm')}>` : ''} ${configuracao.get('ConfigRoles.cargosup') ? `<@&${configuracao.get('ConfigRoles.cargosup')}>` : ''}`;
  await thread.send({ components: clientPanel(support, interaction.user.id, interaction.guild.id), embeds: [embed], content: mention });
  if (support) {
    await thread.send({ embeds: [purchasesEmbed(interaction.user.id, interaction.guild.id)], components: [...purchasePanel(interaction.user.id, interaction.guild.id), ...notProductPanel()] });
  }
  return true;
}

function valueOf(fields, id) { return fields.getTextInputValue(id).trim(); }
function purchaseList(userId, guildId) {
  return estatisticas.fetchAll().map(([key, data]) => ({ key, ...(data || {}) })).filter(item => String(item.userid) === String(userId) && (!item.guildid || String(item.guildid) === String(guildId))).slice(0, 25);
}
function purchasePanel(userId, guildId) {
  const list = purchaseList(userId, guildId);
  if (!list.length) return [];
  const menu = new StringSelectMenuBuilder()
    .setCustomId('ticket_client_purchase')
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
  return rows;
}
function notProductPanel() {
  return [new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('ticket_not_product')
      .setLabel('Não é sobre um produto adquirido')
      .setEmoji('🆘')
      .setStyle(ButtonStyle.Secondary)
  )];
}

function purchasesEmbed(userId, guildId) {
  const list = purchaseList(userId, guildId);
  return new EmbedBuilder().setTitle('🛍️ Compras encontradas')
    .setDescription(list.length ? 'Selecione abaixo a compra relacionada a este atendimento. O menu mostra nome, quantidade e valor.' : 'Nenhuma compra encontrada para este usuário.')
    .setColor('#5865f2');
}
async function createTicketFromModal(interaction) {
  const formSupport = interaction.customId === `${FORM_PREFIX}support`;
  const cooldown = aberturaCooldown.get(interaction.user.id) || 0;
  if (Date.now() - cooldown < 30000) return interaction.reply({ content: '⏳ Aguarde alguns segundos antes de abrir outro ticket.', ephemeral: true });
  aberturaCooldown.set(interaction.user.id, Date.now());
  await interaction.deferReply({ ephemeral: true });
  const functions = tickets.get('tickets.funcoes') || {};
  const entry = Object.entries(functions).find(([key, item]) => formSupport ? isSupportType(item?.nome || key) : !isSupportType(item?.nome || key));
  const support = formSupport && Boolean(entry && isSupportType(entry[1]?.nome || entry[0]));
  const fallback = support
    ? ['Suporte ao Cliente', { nome: 'Suporte ao Cliente', descricao: 'Atendimento sobre compras, pagamentos, pedidos ou produtos.' }]
    : ['Dúvidas', { nome: 'Dúvidas', descricao: 'Perguntas sobre produtos, serviços, valores ou funcionamento da loja.' }];
  const [key, ggg] = entry || fallback;
  const existing = interaction.channel.threads.cache.find(x => x.name.includes(interaction.user.id));
  if (existing) {
    const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setURL(`https://discord.com/channels/${interaction.guild.id}/${existing.id}`).setLabel('Ir para o Ticket').setStyle(ButtonStyle.Link));
    return interaction.editReply({ content: '❌ Você já possui um ticket aberto.', components: [row] });
  }
  const order = support ? valueOf(interaction.fields, 'ticket_order') : '';
  const customer = valueOf(interaction.fields, 'ticket_customer');
  const description = valueOf(interaction.fields, 'ticket_description');
  const name = `${ggg.nome || key}・${interaction.user.username}・${interaction.user.id}`;
  const thread = await interaction.channel.threads.create({
    name: name.slice(0, 100), autoArchiveDuration: 60, type: ChannelType.PrivateThread,
    reason: 'Ticket aberto', members: [interaction.user.id],
    permissionOverwrites: [
      { id: configuracao.get('ConfigRoles.cargoadm'), allow: [PermissionFlagsBits.SendMessagesInThreads] },
      { id: configuracao.get('ConfigRoles.cargosup'), allow: [PermissionFlagsBits.SendMessagesInThreads] },
      { id: interaction.user.id, allow: [PermissionFlagsBits.SendMessagesInThreads] }
    ].filter(x => x.id)
  });
  const appearance = tickets.get('tickets.aparencia') || {};
  const embed = new EmbedBuilder().setAuthor({ name: interaction.user.username, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) }).setTitle(ggg.nome || key)
    .setDescription(ggg.descricao || ggg.predescricao || 'Atendimento').addFields(
      ...(support ? [{ name: '🧾 Pedido', value: order.slice(0, 1024), inline: true }] : []),
      { name: '👤 Cliente', value: customer.slice(0, 1024), inline: true },
      { name: '📝 Descrição', value: description.slice(0, 1024) }
    ).setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL({ dynamic: true }) }).setTimestamp();
  if (appearance.color) embed.setColor(appearance.color);
  if (ggg.banner) embed.setImage(ggg.banner);
  const mention = `${interaction.user} ${configuracao.get('ConfigRoles.cargoadm') ? `<@&${configuracao.get('ConfigRoles.cargoadm')}>` : ''} ${configuracao.get('ConfigRoles.cargosup') ? `<@&${configuracao.get('ConfigRoles.cargosup')}>` : ''}`;
  await thread.send({ content: mention, embeds: [embed], components: clientPanel(support, interaction.user.id, interaction.guild.id) });
  if (support) {
    await thread.send({ embeds: [purchasesEmbed(interaction.user.id, interaction.guild.id)], components: [...purchasePanel(interaction.user.id, interaction.guild.id), ...notProductPanel()] });
  }
  const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setURL(`https://discord.com/channels/${interaction.guild.id}/${thread.id}`).setLabel('Ir para o Ticket').setStyle(ButtonStyle.Link));
  return interaction.editReply({ content: '✅ Ticket criado com sucesso!', components: [row] });
}
module.exports = { CreateTicket, createTicketFromModal, formCustomId, isSupportType, openForm };
