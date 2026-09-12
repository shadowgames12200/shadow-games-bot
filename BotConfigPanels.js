const {
  ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder,
  ModalBuilder, TextInputBuilder, TextInputStyle,
  ChannelSelectMenuBuilder, ChannelType, StringSelectMenuBuilder
} = require('discord.js');
const { db, save } = require('./ProfessionalSuite');

const LOG_EVENTS = {
  member_join: 'Entrada no servidor', member_leave: 'Saída do servidor', ban: 'Banimento', unban: 'Desbanimento',
  voice_join: 'Entrada em voz', voice_leave: 'Saída da voz', voice_move: 'Mudança de voz',
  message_delete: 'Mensagem apagada', message_edit: 'Mensagem editada', ticket_open: 'Ticket aberto',
  ticket_close: 'Ticket fechado', ticket_claim: 'Ticket assumido', channel_create: 'Canal criado',
  channel_delete: 'Canal apagado', role_create: 'Cargo criado', role_delete: 'Cargo removido',
  invite_create: 'Convite criado', invite_delete: 'Convite excluído'
};

function ensure(guildId) {
  db.botConfig ||= {};
  db.botConfig[guildId] ||= {};
  const c = db.botConfig[guildId];
  c.ticket ||= { public: { title: 'Central de Atendimento', description: 'Escolha uma opção abaixo.', banner: '', logo: '', color: '#7c3aed', channelId: '', buttons: [] }, internal: { title: 'Painel do atendimento', description: 'Use as opções abaixo para gerenciar este ticket.', buttons: ['notify','claim','transcript','close'] }, purchases: { title: 'Compras encontradas', description: 'Selecione uma compra ou continue sem produto.', enabled: true }, transcriptChannelId: '' };
  c.logs ||= { channels: {} };
  c.ticket.transcriptChannelId ||= '';
  db.ticketConfig ||= {}; db.ticketConfig.assumeRoleIds ||= [];
  return c;
}
function owner(i) { return i.memberPermissions?.has('Administrator') || i.memberPermissions?.has('ManageGuild'); }
function row(...buttons) { return new ActionRowBuilder().addComponents(buttons); }
function btn(id, label, style=ButtonStyle.Secondary, emoji) { const b = new ButtonBuilder().setCustomId(id).setLabel(label).setStyle(style); if (emoji) b.setEmoji(emoji); return b; }
function color(value) { return /^#?[0-9a-f]{6}$/i.test(String(value||'')) ? (String(value).startsWith('#') ? value : `#${value}`) : '#7c3aed'; }

function ticketHome(i) {
  const c = ensure(i.guild.id).ticket;
  const e = new EmbedBuilder().setColor(color(c.public.color)).setTitle('Configuração do Sistema de Ticket').setDescription('Configure cada página separadamente. O sistema de vendas não é alterado.').addFields(
    { name: '1. Painel público', value: `${c.public.title}\nCanal: ${c.public.channelId ? `<#${c.public.channelId}>` : 'não definido'}` },
    { name: '2. Painel dentro do ticket', value: `${c.internal.title}\nBotões: ${c.internal.buttons.length}` },
    { name: '3. Acesso e transcript', value: `Cargos para assumir: ${(db.ticketConfig?.assumeRoleIds || []).length}\nTranscript: ${c.transcriptChannelId ? `<#${c.transcriptChannelId}>` : 'não definido'}` },
    { name: '4. Compras encontradas', value: `${c.purchases.enabled ? 'Ativado' : 'Desativado'}\n${c.purchases.title}` }
  );
  return i.reply({ ephemeral: true, embeds: [e], components: [row(btn('bc_ticket_public','Página 1 • Painel público',ButtonStyle.Primary,'1️⃣'), btn('bc_ticket_internal','Página 2 • Dentro do ticket',ButtonStyle.Primary,'2️⃣'), btn('bc_ticket_purchases','Página 3 • Compras',ButtonStyle.Primary,'3️⃣')), row(btn('bc_ticket_access','Cargos e transcript',ButtonStyle.Secondary,'🔐'), btn('bc_ticket_channel','Escolher canal',ButtonStyle.Secondary,'📍'), btn('bc_ticket_post','Postar painel',ButtonStyle.Success,'📤'), btn('bc_ticket_sync','Sincronizar',ButtonStyle.Secondary,'🔄'))] });
}
function logsHome(i) {
  const c = ensure(i.guild.id).logs;
  const lines = Object.entries(LOG_EVENTS).map(([k,n]) => `• **${n}**: ${c.channels[k] ? `<#${c.channels[k]}>` : 'não configurado'}`).join('\n');
  return i.reply({ ephemeral: true, embeds: [new EmbedBuilder().setColor('#7c3aed').setTitle('Configuração de Logs').setDescription('Escolha um evento e depois um canal. Cada evento pode usar um canal diferente.\n\n'+lines.slice(0,3900))], components: [row(btn('bc_logs_select','Escolher evento',ButtonStyle.Primary,'🧾')), row(btn('bc_logs_clear','Remover configuração',ButtonStyle.Danger,'🗑️'), btn('bc_logs_refresh','Atualizar',ButtonStyle.Secondary,'🔄'))] });
}
function modal(id, title, fields) { const m = new ModalBuilder().setCustomId(id).setTitle(title); m.addComponents(...fields.map(f => new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId(f.id).setLabel(f.label).setStyle(f.long ? TextInputStyle.Paragraph : TextInputStyle.Short).setRequired(false).setValue(String(f.value||'').slice(0,4000))))); return m; }
async function ticketModal(i, page) {
  const c = ensure(i.guild.id).ticket;
  if (page === 'access') return i.showModal(modal('bc_ticket_access_save','Acesso aos tickets',[{id:'assumeRoles',label:'Cargos para assumir (IDs por vírgula)',value:(db.ticketConfig.assumeRoleIds||[]).join(',')},{id:'categoryRoles',label:'Cargos por categoria (chave:IDs)',value:Object.entries(db.ticketConfig.teams||{}).map(([k,t])=>`${k}:${(t.roleIds||t.roleId||'')}`).join(';')},{id:'transcriptChannel',label:'Canal do transcript (ID)',value:c.transcriptChannelId||db.ticketConfig.logsChannelId||''}]));
  if (page === 'public') return i.showModal(modal('bc_ticket_public_save','Painel público',[{id:'title',label:'Título',value:c.public.title},{id:'description',label:'Descrição',value:c.public.description,long:true},{id:'banner',label:'URL do banner',value:c.public.banner},{id:'color',label:'Cor HEX',value:c.public.color},{id:'buttons',label:'Botões públicos (separados por vírgula)',value:(c.public.buttons||[]).join(',')}]));
  if (page === 'internal') return i.showModal(modal('bc_ticket_internal_save','Painel dentro do ticket',[{id:'title',label:'Título',value:c.internal.title},{id:'description',label:'Descrição',value:c.internal.description,long:true},{id:'buttons',label:'Botões: notify, claim, transcript, close',value:c.internal.buttons.join(',')}]));
  return i.showModal(modal('bc_ticket_purchase_save','Painel de compras',[{id:'title',label:'Título',value:c.purchases.title},{id:'description',label:'Descrição',value:c.purchases.description,long:true},{id:'enabled',label:'Ativado? sim ou não',value:c.purchases.enabled?'sim':'não'}]));
}
function logEventMenu(i, clear=false) { const opts = Object.entries(LOG_EVENTS).map(([value,label])=>({label,value,description:i.guild ? (ensure(i.guild.id).logs.channels[value] ? 'Configurado' : 'Não configurado') : '',})); return i.reply({ephemeral:true,content:clear?'Escolha o evento cuja configuração deseja remover:':'Escolha o evento:',components:[row(new StringSelectMenuBuilder().setCustomId(clear?'bc_logs_clear_event':'bc_logs_event').setPlaceholder('Selecione um evento').addOptions(opts.slice(0,25)))]}); }
async function postTicket(i) { const c=ensure(i.guild.id).ticket; if(!c.public.channelId) return i.reply({ephemeral:true,content:'❌ Primeiro configure um canal para o painel público.'}); const ch=i.guild.channels.cache.get(c.public.channelId); if(!ch?.isTextBased()) return i.reply({ephemeral:true,content:'❌ Canal inválido.'}); const teams=db.ticketConfig?.teams||{}; const options=Object.entries(teams).slice(0,25).map(([value,t])=>({label:String(t.name||value).slice(0,100),description:String(t.description||'').slice(0,100),value,emoji:t.emoji||'🎫'})); const e=new EmbedBuilder().setColor(color(c.public.color)).setTitle(c.public.title).setDescription(c.public.description); if(c.public.banner)e.setImage(c.public.banner); if(c.public.logo)e.setThumbnail(c.public.logo); const publicButtons=(c.public.buttons||[]).filter(key=>teams[key]).slice(0,5).map(key=>new ButtonBuilder().setCustomId(`ticket_open_button:${key}`).setLabel(String(teams[key].name||key).slice(0,80)).setEmoji(teams[key].emoji||'🎫').setStyle(ButtonStyle.Primary)); const components=[]; if(publicButtons.length) components.push(row(...publicButtons)); components.push(row(new StringSelectMenuBuilder().setCustomId('ticket_category').setPlaceholder('Selecione uma opção').addOptions(options))); await ch.send({embeds:[e],components}); return i.reply({ephemeral:true,content:`✅ Painel publicado em ${ch}.`}); }
async function handle(i) {
  const id=i.customId||'';
  const isTicketConfig = id.startsWith('bc_ticket_') || id.startsWith('bc_logs_');
  if (!i.guild || (isTicketConfig && !owner(i))) {
    if (isTicketConfig && !i.replied && !i.deferred) await i.reply({ephemeral:true,content:'❌ Apenas administradores podem usar este painel.'});
    return false;
  }
  if (i.isButton?.()) {
    if(id==='bc_ticket_access') return ticketModal(i,'access'); if(id==='bc_ticket_public') return ticketModal(i,'public'); if(id==='bc_ticket_internal') return ticketModal(i,'internal'); if(id==='bc_ticket_purchases') return ticketModal(i,'purchases'); if(id==='bc_ticket_channel') return i.reply({ephemeral:true,content:'Escolha o canal do painel público:',components:[row(new ChannelSelectMenuBuilder().setCustomId('bc_ticket_channel_select').setPlaceholder('Selecione um canal').setChannelTypes(ChannelType.GuildText))]}); if(id==='bc_ticket_post') return postTicket(i); if(id==='bc_ticket_sync') return ticketHome(i); if(id==='bc_logs_select') return logEventMenu(i); if(id==='bc_logs_clear') return logEventMenu(i,true); if(id==='bc_logs_refresh') return logsHome(i);
  }
  if(i.isStringSelectMenu?.() && (id==='bc_logs_event'||id==='bc_logs_clear_event')) { const key=i.values[0]; if(id==='bc_logs_clear_event'){delete ensure(i.guild.id).logs.channels[key];save();return logsHome(i);} return i.reply({ephemeral:true,content:`Escolha o canal para **${LOG_EVENTS[key]}**:`,components:[row(new ChannelSelectMenuBuilder().setCustomId(`bc_logs_channel:${key}`).setPlaceholder('Selecione um canal').setChannelTypes(ChannelType.GuildText))]}); }
  if(i.isChannelSelectMenu?.() && id==='bc_ticket_channel_select') { ensure(i.guild.id).ticket.public.channelId=i.values[0]; save(); return ticketHome(i); }
  if(i.isChannelSelectMenu?.() && id.startsWith('bc_logs_channel:')) { const key=id.split(':')[1]; ensure(i.guild.id).logs.channels[key]=i.values[0]; save(); return logsHome(i); }
  if(i.isModalSubmit?.()) { const c=ensure(i.guild.id); const v=x=>i.fields.getTextInputValue(x).trim(); if(id==='bc_ticket_access_save') { db.ticketConfig.assumeRoleIds=v('assumeRoles').replace(/[^0-9,]/g,'').split(',').map(x=>x.trim()).filter(Boolean); for (const item of v('categoryRoles').split(';').map(x=>x.trim()).filter(Boolean)) { const [key,ids] = item.split(':'); if (db.ticketConfig.teams[key]) db.ticketConfig.teams[key].roleIds = (ids||'').split('|').map(x=>x.replace(/[^0-9]/g,'')).filter(Boolean); } c.ticket.transcriptChannelId=v('transcriptChannel').replace(/[^0-9]/g,''); db.ticketConfig.logsChannelId=c.ticket.transcriptChannelId; } if(id==='bc_ticket_public_save') Object.assign(c.ticket.public,{title:v('title')||c.ticket.public.title,description:v('description'),banner:v('banner'),logo:v('logo'),color:color(v('color')),buttons:v('buttons').split(',').map(x=>x.trim()).filter(Boolean).slice(0,5)}); if(id==='bc_ticket_internal_save') Object.assign(c.ticket.internal,{title:v('title')||c.ticket.internal.title,description:v('description'),buttons:v('buttons').split(',').map(x=>x.trim()).filter(Boolean)}); if(id==='bc_ticket_purchase_save') Object.assign(c.ticket.purchases,{title:v('title')||c.ticket.purchases.title,description:v('description'),enabled:/^(sim|s|yes|true|1)$/i.test(v('enabled'))}); save(); return ticketHome(i); }
  return false;
}
function install(client) {
  client.on('interactionCreate', async interaction => {
    try { await handle(interaction); } catch (error) { console.error('[BotConfigPanels]', error); if (interaction.isRepliable?.() && !interaction.replied && !interaction.deferred) await interaction.reply({ephemeral:true,content:'❌ Ocorreu um erro ao processar esta opção. Tente novamente.'}).catch(()=>{}); }
  });
}

module.exports={ticketHome,logsHome,handle,ensure,LOG_EVENTS,install};
