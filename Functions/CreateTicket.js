const { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ChannelType, PermissionFlagsBits } = require('discord.js');

const { configuracao, tickets, estatisticas } = require('../DataBaseJson');

const aberturaCooldown = new Map();

const FORM_PREFIX = 'ticket_open_form_';

function normalize(value) { return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); }

function isSupportType(value) { const text = normalize(value); return text.includes('suporte') || text.includes('cliente') || text.includes('pedido') || text.includes('compra'); }

function formKind(value) { return isSupportType(value) ? 'support' : 'doubt'; }

function formCustomId(value) { return `${FORM_PREFIX}${formKind(value)}`; }

function openForm(valor) { const support = formKind(valor) === 'support'; const modal = new ModalBuilder().setCustomId(formCustomId(valor)).setTitle(support ? 'Suporte ao Cliente' : 'Dúvidas'); const fields = support ? [['ticket_customer','Nome','Informe seu nome ou usuário',true],['ticket_order','Nome ou ID do produto','Ex.: 123456 ou Plano de jogos',true],['ticket_description','Descrição','Explique detalhadamente o que aconteceu',true]] : [['ticket_customer','Nome do cliente ou usuário','Informe seu nome ou usuário',true],['ticket_description','Descrição','Escreva sua dúvida',true]]; modal.addComponents(fields.map(([id,label,placeholder,required]) => new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId(id).setLabel(label).setPlaceholder(placeholder).setStyle(id === 'ticket_description' ? TextInputStyle.Paragraph : TextInputStyle.Short).setRequired(required).setMaxLength(id === 'ticket_description' ? 1000 : 100)))); return modal; }

async function CreateTicket(interaction, valor) { const customId = String(interaction.customId || ''); const isButtonOpen = interaction.isButton?.() && customId.startsWith('AbrirTicket_'); const isMenuOpen = interaction.isStringSelectMenu?.() && customId === 'ticket_public_options'; if (!isButtonOpen && !isMenuOpen) return false; const selected = isMenuOpen ? interaction.values?.[0] : customId.replace('AbrirTicket_', ''); await interaction.showModal(openForm(valor || selected)); return true; }

function valueOf(fields,id) { return fields.getTextInputValue(id).trim(); }

function purchaseList(userId,guildId) { return estatisticas.fetchAll().map(item => ({ key:item.ID, ...item.data })).filter(item => String(item.userid) === String(userId) && (!item.guildid || String(item.guildid) === String(guildId))).slice(0,25); }

function purchasePanel(userId,guildId) { const list = purchaseList(userId,guildId); if (!list.length) return []; const menu = new StringSelectMenuBuilder().setCustomId('ticket_purchase_link').setPlaceholder('Selecionar compra').addOptions(list.map((p,i) => ({ value:String(p.key), label:`${i+1}. ${String(p.produto || 'Produto').slice(0,80)}`, description:`Pedido ${p.idpagamento || p.key}`.slice(0,100) }))); return [new ActionRowBuilder().addComponents(menu)]; }

function clientPanel(isSupport,userId,guildId) { const options = new StringSelectMenuBuilder().setCustomId('ticket_client_options').setPlaceholder('Opções').addOptions({label:'Informar pagamento',description:'Avisar a equipe sobre um pagamento',value:'payment',emoji:'💳'},{label:'Atualização do pedido',description:'Solicitar atualização do atendimento',value:'update',emoji:'📦'},{label:'Enviar outra informação',description:'Adicionar uma informação no ticket',value:'info',emoji:'📝'},{label:'Adicionar membro',description:'Solicitar a entrada de outra pessoa',value:'add_member',emoji:'👤'}); return [new ActionRowBuilder().addComponents(options)]; }

function purchasesEmbed(userId,guildId) { const list = purchaseList(userId,guildId); return new EmbedBuilder().setTitle('🛍️ Compras encontradas').setDescription(list.length ? 'Selecione abaixo a compra relacionada a este atendimento.' : 'Nenhuma compra encontrada para este usuário.').setColor('#5865f2'); }

async function createTicketFromModal(interaction) { const support = interaction.customId === `${FORM_PREFIX}support`; const cooldown = aberturaCooldown.get(interaction.user.id) || 0; if (Date.now()-cooldown < 30000) return interaction.reply({content:'⏳ Aguarde alguns segundos antes de abrir outro ticket.',ephemeral:true}); aberturaCooldown.set(interaction.user.id,Date.now()); await interaction.deferReply({ephemeral:true}); const functions = tickets.get('tickets.funcoes') || {}; const entry = O
