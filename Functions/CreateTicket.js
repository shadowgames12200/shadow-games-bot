const { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');

const { tickets, estatisticas } = require('../DataBaseJson');

const PREFIX = 'ticket_open_form_';

const support = v => /suporte|cliente|compra|pedido/i.test(String(v || ''));

function form(v) { const is = support(v); const m = new ModalBuilder().setCustomId(PREFIX + (is ? 'support' : 'doubt')).setTitle(is ? 'Suporte ao Cliente' : 'Dúvidas'); const a = (id,label,placeholder,style=TextInputStyle.Short) => new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId(id).setLabel(label).setPlaceholder(placeholder).setStyle(style).setRequired(true)); m.addComponents(a('ticket_customer','Nome','Informe seu nome ou usuário')); if (is) m.addComponents(a('ticket_order','Nome ou ID do produto','Ex.: 123456 ou Plano de jogos')); m.addComponents(a('ticket_description','Descrição','Explique detalhadamente o que aconteceu',TextInputStyle.Paragraph)); return m; }

async function CreateTicket(interaction, valor) { const id=String(interaction.customId||''); if (interaction.isStringSelectMenu?.() && id==='ticket_public_options') { await interaction.showModal(form(interaction.values[0])); return true; } if (interaction.isButton?.() && id.startsWith('AbrirTicket_')) { await interaction.showModal(form(id.slice(12))); return true; } return false; }

function compras(userId) { return estatisticas.fetchAll().map(x=>({key:x.ID,...x.data})).filter(x=>String(x.userid)===String(userId)).slice(0,25); }

function comprasMenu(userId) { const list=compras(userId); if(!list.length) return []; return [new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId('ticket_purchase_link').setPlaceholder('Selecionar compra').addOptions(list.map((x,i)=>({value:String(x.key),label:`${i+1}. ${String(x.produto||'Produto').slice(0,90)}`,description:`Pedido ${x.idpagamento||x.key}`.slice(0,100)}))))]; }

function opcoes() { return [new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId('ticket_client_options').setPlaceholder('Opções').addOptions({value:'payment',label:'Informar pagamento',emoji:'💳'},{value:'update',label:'Atualização do pedido',emoji:'📦'},{value:'info',label:'Enviar outra informação',emoji:'📝'}))]; }

function comprasEmbed(userId) { return new EmbedBuilder().setTitle('🛍️ Compras encontradas').setDescription(compras(userId).length ? 'Selecione abaixo a compra relacionada a este atendimento.' : 'Nenhuma compra encontrada para este usuário.').setColor('#5865f2'); }

module.exports = { CreateTicket, form, comprasMenu, comprasEmbed, opcoes };
