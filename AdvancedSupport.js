const {
  Events, ModalBuilder, ActionRowBuilder, TextInputBuilder, TextInputStyle,
  EmbedBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, ChannelType
} = require('discord.js');
const { db, save, closeTicket } = require('./ProfessionalSuite');

function ensure() {
  db.teams ||= {};
  db.forms ||= {};
  db.tickets ||= {};
  db.supportMetrics ||= { firstResponseMs: [], resolutionMs: [], byTeam: {}, byAgent: {} };
  save();
}
function team(key) { return db.teams[key] || { name: key === 'geral' ? 'Atendimento geral' : key, roleId: db.settings.ticketTeamRoleId || '', categoryId: db.settings.ticketCategoryId || '', enabled: true }; }
function form(key) { return db.forms[key] || { title: `Atendimento ${team(key).name}`, questions: ['Explique sua necessidade'], team: key }; }
function staff(interaction) { return interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels) || interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild) || interaction.memberPermissions?.has(PermissionFlagsBits.Administrator); }
function modalFor(key) {
  const cfg = form(key);
  const modal = new ModalBuilder().setCustomId(`advanced_ticket_form:${key}`).setTitle(String(cfg.title).slice(0, 45));
  const questions = (cfg.questions || ['Explique sua necessidade']).slice(0, 5);
  modal.addComponents(...questions.map((question, i) => new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId(`answer_${i}`).setLabel(String(question).slice(0, 45)).setStyle(i === 0 ? TextInputStyle.Paragraph : TextInputStyle.Short).setRequired(true).setMaxLength(1000))));
  return modal;
}
function userModal(action) {
  const input = new TextInputBuilder().setCustomId('user_id').setLabel('ID do usuário Discord').setPlaceholder('Cole o ID do usuário').setStyle(TextInputStyle.Short).setRequired(true).setMinLength(17).setMaxLength(22);
  return new ModalBuilder().setCustomId(`ticket_user:${action}`).setTitle(action === 'add' ? 'Adicionar usuário' : 'Remover usuário').addComponents(new ActionRowBuilder().addComponents(input));
}
function ticketButtons() {
  return [new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ticket_claim').setLabel('Assumir').setEmoji('🎟️').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('ticket_add_user').setLabel('Adicionar').setEmoji('➕').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('ticket_remove_user').setLabel('Remover').setEmoji('➖').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('ticket_close').setLabel('Fechar').setEmoji('🔒').setStyle(ButtonStyle.Danger)
  ), new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ticket_pending').setLabel('Pendente').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('ticket_resolved').setLabel('Resolvido').setStyle(ButtonStyle.Success)
  )];
}
async function createTicket(interaction, key) {
  const cfg = team(key); const f = form(key);
  const existing = Object.values(db.tickets).find(t => t.ownerId === interaction.user.id && t.team === key && !['resolved', 'closed'].includes(t.status));
  if (existing) return interaction.reply({ content: `❌ Você já possui um ticket aberto: <#${existing.channelId}>`, ephemeral: true });
  const answers = (f.questions || []).slice(0, 5).map((q, i) => ({ question: q, answer: interaction.fields.getTextInputValue(`answer_${i}`) }));
  const guild = interaction.guild; const safe = String(key).replace(/[^a-z0-9-]/gi, '-').slice(0, 20);
  const overwrites = [{ id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] }, { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] }];
  if (cfg.roleId) overwrites.push({ id: cfg.roleId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] });
  const channel = await guild.channels.create({ name: `ticket-${safe}-${interaction.user.username}`.slice(0, 95), type: ChannelType.GuildText, parent: cfg.categoryId || undefined, permissionOverwrites: overwrites, topic: JSON.stringify({ ownerId: interaction.user.id, team: key, lastActivity: Date.now(), firstResponseAt: null }) });
  const ticket = { channelId: channel.id, ownerId: interaction.user.id, team: key, status: 'open', priority: 'normal', openedAt: Date.now(), lastActivity: Date.now(), firstResponseAt: null, slaDueAt: Date.now() + Number(db.settings.slaHours || 24) * 3600000, answers };
  db.tickets[channel.id] = ticket; db.stats.opened++; db.stats.byTeam[key] = (db.stats.byTeam[key] || 0) + 1; save();
  const description = answers.map(x => `**${x.question}**\n${x.answer}`).join('\n\n');
  await channel.send({ content: `<@${interaction.user.id}>${cfg.roleId ? ` <@&${cfg.roleId}>` : ''}`, embeds: [new EmbedBuilder().setColor(0x5865f2).setTitle(f.title).setDescription(description).setFooter({ text: 'Shadow Games · Atendimento' }).setTimestamp()], components: ticketButtons() });
  return interaction.reply({ content: `✅ Atendimento encaminhado para **${cfg.name}**: ${channel}`, ephemeral: true });
}
async function changeUser(interaction, action) {
  if (!staff(interaction)) return interaction.reply({ content: '❌ Apenas a equipe pode alterar participantes.', ephemeral: true });
  const id = interaction.fields.getTextInputValue('user_id').trim();
  const user = await interaction.guild.members.fetch(id).catch(() => null);
  if (!user) return interaction.reply({ content: '❌ Usuário não encontrado neste servidor.', ephemeral: true });
  if (action === 'add') await interaction.channel.permissionOverwrites.edit(id, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true });
  else if (id !== interaction.user.id) await interaction.channel.permissionOverwrites.delete(id).catch(() => {});
  return interaction.reply({ content: `✅ Usuário ${action === 'add' ? 'adicionado ao' : 'removido do'} ticket.`, ephemeral: true });
}
function adminPanel(){return {embeds:[new EmbedBuilder().setColor(0x5865f2).setTitle('🎫 Configuração de tickets').setDescription('Escolha uma área para configurar.\n\n✅ As mudanças são salvas automaticamente.\n🛍️ O sistema de vendas permanece separado e intacto.')],components:[new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('ticket_admin_general').setLabel('Categoria e equipe').setEmoji('⚙️').setStyle(ButtonStyle.Primary),new ButtonBuilder().setCustomId('ticket_admin_form').setLabel('Formulário').setEmoji('📝').setStyle(ButtonStyle.Primary),new ButtonBuilder().setCustomId('ticket_admin_automation').setLabel('Automação').setEmoji('🤖').setStyle(ButtonStyle.Secondary),new ButtonBuilder().setCustomId('ticket_admin_appearance').setLabel('Aparência').setEmoji('🎨').setStyle(ButtonStyle.Secondary)),new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('ticket_admin_permissions').setLabel('Permissões').setEmoji('🔐').setStyle(ButtonStyle.Secondary),new ButtonBuilder().setCustomId('ticket_admin_publish').setLabel('Publicar painel').setEmoji('📌').setStyle(ButtonStyle.Success),new ButtonBuilder().setCustomId('ticket_admin_help').setLabel('Como usar').setEmoji('❓').setStyle(ButtonStyle.Secondary))]};}
function adminModal(id,title,fields){const m=new ModalBuilder().setCustomId(id).setTitle(title);m.addComponents(...fields.map(x=>new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId(x.id).setLabel(x.label).setStyle(x.long?TextInputStyle.Paragraph:TextInputStyle.Short).setRequired(x.required!==false).setValue(String(x.value||'')).setMaxLength(x.max||1000))));return m;}
function install(client) {
  ensure();
  client.on(Events.InteractionCreate, async interaction => {
    try {
      if (interaction.isButton() && interaction.customId === 'ticket_admin_general') return interaction.showModal(adminModal('ticket_admin_general_modal','Categoria e equipe',[{id:'category',label:'ID da categoria de tickets',value:db.settings.ticketCategoryId},{id:'role',label:'ID do cargo da equipe',value:db.settings.ticketTeamRoleId,required:false}]));
      if (interaction.isButton() && interaction.customId === 'ticket_admin_form') return interaction.showModal(adminModal('ticket_admin_form_modal','Formulário de abertura',[{id:'title',label:'Título do formulário',value:(db.forms.geral||{}).title||'Abrir atendimento'},{id:'questions',label:'Perguntas separadas por |',value:((db.forms.geral||{}).questions||['Explique sua necessidade']).join(' | '),long:true}]));
      if (interaction.isButton() && interaction.customId === 'ticket_admin_automation') return interaction.showModal(adminModal('ticket_admin_automation_modal','Automação dos tickets',[{id:'inactivity',label:'Horas até fechamento por inatividade',value:db.settings.inactivityHours||72},{id:'sla',label:'Horas para primeira resposta (SLA)',value:db.settings.slaHours||24}]));
      if (interaction.isButton() && interaction.customId === 'ticket_admin_appearance') return interaction.showModal(adminModal('ticket_admin_appearance_modal','Aparência do painel',[{id:'title',label:'Título do painel',value:(db.forms.geral||{}).title||'Atendimento Shadow Games'},{id:'color',label:'Cor hexadecimal',value:db.settings.ticketColor||'#5865f2'},{id:'banner',label:'URL do banner (opcional)',value:db.settings.ticketBanner||'',required:false}]));
      if (interaction.isButton() && interaction.customId === 'ticket_admin_permissions') return interaction.reply({content:'🔐 Use `/profissional permissao` para autorizar cargos a assumir, fechar e consultar tickets.\n\nExemplo: `/profissional permissao operacao:Assumir ticket cargo:@Atendimento`',ephemeral:true});
      if (interaction.isButton() && interaction.customId === 'ticket_admin_help') return interaction.reply({content:'📘 Fluxo recomendado:\n1. Configure categoria e cargo.\n2. Configure o formulário.\n3. Ajuste SLA e inatividade.\n4. Clique em Publicar painel.\n5. Use `/profissional equipe` e `/profissional painel-equipe` para painéis separados por setor.',ephemeral:true});
      if (interaction.isButton() && interaction.customId === 'ticket_admin_publish') return interaction.reply({content:'📌 Para publicar, use `/profissional painel-ticket` no canal desejado. O painel publicado usará todas as configurações salvas aqui.',ephemeral:true});
      if (interaction.isModalSubmit() && interaction.customId === 'ticket_admin_general_modal') { const category=interaction.fields.getTextInputValue('category').trim(); const role=interaction.fields.getTextInputValue('role').trim(); const ch=await interaction.guild.channels.fetch(category).catch(()=>null); if(!ch||ch.type!==ChannelType.GuildCategory)return interaction.reply({content:'❌ ID de categoria inválido.',ephemeral:true}); if(role&&!interaction.guild.roles.cache.has(role))return interaction.reply({content:'❌ ID de cargo inválido.',ephemeral:true}); db.settings.ticketCategoryId=category; if(role)db.settings.ticketTeamRoleId=role; save(); return interaction.reply({content:'✅ Categoria e equipe salvas.',ephemeral:true}); }
      if (interaction.isModalSubmit() && interaction.customId === 'ticket_admin_form_modal') { const title=interaction.fields.getTextInputValue('title').trim(); const questions=interaction.fields.getTextInputValue('questions').split('|').map(x=>x.trim()).filter(Boolean).slice(0,5); if(!questions.length)return interaction.reply({content:'❌ Informe ao menos uma pergunta.',ephemeral:true}); db.forms.geral={title,questions,team:'geral'}; save(); return interaction.reply({content:`✅ Formulário salvo com ${questions.length} pergunta(s).`,ephemeral:true}); }
      if (interaction.isModalSubmit() && interaction.customId === 'ticket_admin_appearance_modal') { db.settings.ticketColor=interaction.fields.getTextInputValue('color').trim(); db.settings.ticketBanner=interaction.fields.getTextInputValue('banner').trim(); db.forms.geral ||= {questions:['Explique sua necessidade'],team:'geral'}; db.forms.geral.title=interaction.fields.getTextInputValue('title').trim(); save(); return interaction.reply({content:'✅ Aparência salva.',ephemeral:true}); }
      if (interaction.isModalSubmit() && interaction.customId === 'ticket_admin_automation_modal') { const inactivity=Number(interaction.fields.getTextInputValue('inactivity')); const sla=Number(interaction.fields.getTextInputValue('sla')); if(!Number.isInteger(inactivity)||inactivity<1||!Number.isInteger(sla)||sla<1)return interaction.reply({content:'❌ Informe horas inteiras maiores que zero.',ephemeral:true}); db.settings.inactivityHours=inactivity; db.settings.slaHours=sla; save(); return interaction.reply({content:'✅ Automação salva.',ephemeral:true}); }
      if (interaction.isButton() && interaction.customId.startsWith('advanced_ticket_open:')) return interaction.showModal(modalFor(interaction.customId.split(':')[1]));
      if (interaction.isModalSubmit() && interaction.customId.startsWith('advanced_ticket_form:')) return createTicket(interaction, interaction.customId.split(':')[1]);
      if (interaction.isButton() && interaction.customId === 'ticket_add_user') return interaction.showModal(userModal('add'));
      if (interaction.isButton() && interaction.customId === 'ticket_remove_user') return interaction.showModal(userModal('remove'));
      if (interaction.isModalSubmit() && interaction.customId.startsWith('ticket_user:')) return changeUser(interaction, interaction.customId.split(':')[1]);
      if (interaction.isButton() && ['ticket_pending', 'ticket_resolved'].includes(interaction.customId)) { const ticket = db.tickets[interaction.channelId]; if (!ticket) return interaction.reply({ content: '❌ Ticket não encontrado.', ephemeral: true }); if (!ticket.agentId && !staff(interaction)) return interaction.reply({ content: '❌ Assuma o ticket antes de alterar o status.', ephemeral: true }); ticket.status = interaction.customId === 'ticket_pending' ? 'pending' : 'resolved'; ticket.lastActivity = Date.now(); save(); return interaction.reply({ content: `✅ Status atualizado para **${ticket.status}**.`, ephemeral: true }); }
    } catch (error) { console.error('[AdvancedSupport]', error); if (!interaction.replied && !interaction.deferred) await interaction.reply({ content: '❌ Não foi possível processar o atendimento.', ephemeral: true }).catch(() => {}); }
  });
  client.on(Events.MessageCreate, message => {
    if (!message.guild || message.author.bot || !db.tickets[message.channelId]) return;
    const ticket = db.tickets[message.channelId]; ticket.lastActivity = Date.now();
    if (!ticket.firstResponseAt && message.author.id !== ticket.ownerId) { ticket.firstResponseAt = Date.now(); db.supportMetrics.firstResponseMs.push(ticket.firstResponseAt - ticket.openedAt); }
    if (ticket.agentId) { db.supportMetrics.byAgent[ticket.agentId] ||= { messages: 0, closed: 0 }; db.supportMetrics.byAgent[ticket.agentId].messages++; }
    save();
  });
}
module.exports = { install, ensure, team, form };
