const { Events, EmbedBuilder, AuditLogEvent } = require('discord.js');



const { db, save } = require('./ProfessionalSuite');
const COLORS = { main: '#7c3aed', good: '#22c55e', bad: '#ef4444', info: '#3b82f6', warn: '#f59e0b' };
const EVENTS = { membro_entrada: 'Entrada no servidor', membro_saida: 'Saída do servidor', banimento: 'Banimento', desbanimento: 'Desbanimento', voz_entrada: 'Entrada em voz', voz_saida: 'Saída da voz', voz_mudanca: 'Mudança de voz', mensagem_apagada: 'Mensagem apagada', mensagem_editada: 'Mensagem editada', ticket_aberto: 'Ticket aberto', ticket_fechado: 'Ticket fechado', ticket_assumido: 'Ticket assumido', canal_criado: 'Canal criado', canal_apagado: 'Canal apagado', cargo_criado: 'Cargo criado', cargo_removido: 'Cargo removido', convite_criado: 'Convite criado', convite_excluido: 'Convite excluído' };
const LEGACY = { membros: 'membro_entrada', mensagens: 'mensagem_apagada', tickets: 'ticket_aberto', voz: 'voz_entrada', canais: 'canal_criado', cargos: 'cargo_criado', convites: 'convite_criado', moderacao: 'banimento' };
const PANEL_KEYS = { membro_entrada: 'member_join', membro_saida: 'member_leave', banimento: 'ban', desbanimento: 'unban', voz_entrada: 'voice_join', voz_saida: 'voice_leave', voz_mudanca: 'voice_move', mensagem_apagada: 'message_delete', mensagem_editada: 'message_edit', ticket_aberto: 'ticket_open', ticket_fechado: 'ticket_close', ticket_assumido: 'ticket_claim', canal_criado: 'channel_create', canal_apagado: 'channel_delete', cargo_criado: 'role_create', cargo_removido: 'role_delete', convite_criado: 'invite_create', convite_excluido: 'invite_delete' };
function eventKey(value) { const key = String(value || '').toLowerCase(); return EVENTS[key] ? key : Object.keys(PANEL_KEYS).find(k => PANEL_KEYS[k] === key) || LEGACY[key] || key; }
function ensure() { db.serverLogs ||= {}; }
function configFor(guildId) { ensure(); db.serverLogs[guildId] ||= { channelId: '', enabled: true, channels: {} }; db.serverLogs[guildId].channels ||= {}; return db.serverLogs[guildId]; }
function setChannel(guildId, event, channelId) { const config = configFor(guildId); const key = eventKey(event); if (channelId) config.channels[key] = channelId; else delete config.channels[key]; save(); return config; }
function status(guildId) { const config = configFor(guildId); return { ...config, channels: { ...config.channels } }; }
async function channelFor(guild, event) {
 if (!guild) return null;
 const config = configFor(guild.id);
 if (config.enabled === false) return null;
 const key = eventKey(event);
 const panelChannels = db.botConfig?.[guild.id]?.logs?.channels || {};
 const id = config.channels[key] || config.channels[PANEL_KEYS[key]] || panelChannels[PANEL_KEYS[key]] || panelChannels[key] || config.channelId || db.settings?.logChannelId;
 if (!id) { console.warn(`[Logs] Nenhum canal configurado para ${guild.name} (${guild.id}), evento=${key}`); return null; }
 const channel = guild.channels.cache.get(id) || await guild.channels.fetch(id).catch(error => { console.warn(`[Logs] Não foi possível buscar o canal ${id}: ${error.message}`); return null; });
 if (!channel?.isTextBased()) { console.warn(`[Logs] O canal ${id} não é um canal de texto utilizável.`); return null; }
 return channel;
}
const clean = (value, max = 900) => String(value ?? 'Sem conteúdo').trim().slice(0, max) || 'Sem conteúdo';
const who = user => user ? `${user.tag || user.username} (<@${user.id}>)` : 'Desconhecido';
function embed(title, description, color = COLORS.main) { return new EmbedBuilder().setColor(color).setTitle(title).setDescription(clean(description, 4000)).setTimestamp(); }
async function send(guild, event, message) { const key = eventKey(event); const channel = await channelFor(guild, key); if (!channel) return false; try { await channel.send({ embeds: [message] }); return true; } catch (error) { console.error(`[Logs] Falha ao enviar evento ${key} para o canal ${channel.id}: ${error.message}`); return false; } }
const isTicket = channel => String(channel?.topic || '').startsWith('ticket:');
async function install(client) {
 client.on(Events.GuildMemberAdd, member => send(member.guild, 'membro_entrada', embed('Entrada no servidor', `${member} entrou no servidor.`, COLORS.good)));
 client.on(Events.GuildMemberRemove, async member => { const logs = await member.guild.fetchAuditLogs({ type: AuditLogEvent.MemberKick, limit: 5 }).catch(() => null); const kicked = logs?.entries.some(entry => entry.target?.id === member.id); send(member.guild, 'membro_saida', embed(kicked ? 'Membro expulso' : 'Saída do servidor', `${who(member.user)}${kicked ? ' foi expulso.' : ' saiu do servidor.'}`, COLORS.bad)); });
 client.on(Events.GuildBanAdd, ban => send(ban.guild, 'banimento', embed('Banimento', who(ban.user), COLORS.bad)));
 client.on(Events.GuildBanRemove, ban => send(ban.guild, 'desbanimento', embed('Desbanimento', who(ban.user), COLORS.good)));
 client.on(Events.MessageDelete, message => { if (!message.guild || message.author?.bot) return; send(message.guild, 'mensagem_apagada', embed('Mensagem apagada', `Canal: ${message.channel} | Autor: ${who(message.author)} | Conteúdo: ${clean(message.content)}`, COLORS.bad)); });
 client.on(Events.MessageBulkDelete, (messages, channel) => channel.guild && send(channel.guild, 'mensagem_apagada', embed('Mensagens apagadas em massa', `${messages.size} mensagens apagadas em ${channel}.`, COLORS.bad)));
 client.on(Events.MessageUpdate, (oldMessage, newMessage) => { if (!newMessage.guild || newMessage.author?.bot || oldMessage.content === newMessage.content) return; send(newMessage.guild, 'mensagem_editada', embed('Mensagem editada', `Canal: ${newMessage.channel} | Autor: ${who(newMessage.author)} | Antes: ${clean(oldMessage.content)} | Depois: ${clean(newMessage.content)}`, COLORS.warn)); });
 client.on(Events.ChannelCreate, channel => channel.guild && send(channel.guild, isTicket(channel) ? 'ticket_aberto' : 'canal_criado', embed(isTicket(channel) ? 'Ticket aberto' : 'Canal criado', `${channel} | Nome: ${channel.name}`, COLORS.good)));
 client.on(Events.ChannelDelete, channel => channel.guild && send(channel.guild, isTicket(channel) ? 'ticket_fechado' : 'canal_apagado', embed(isTicket(channel) ? 'Ticket fechado' : 'Canal apagado', `Nome: ${channel.name}`, COLORS.bad)));
 client.on(Events.RoleCreate, role => send(role.guild, 'cargo_criado', embed('Cargo criado', role.name, COLORS.good)));
 client.on(Events.RoleDelete, role => send(role.guild, 'cargo_removido', embed('Cargo removido', role.name, COLORS.bad)));
 client.on(Events.VoiceStateUpdate, (oldState, newState) => { const guild = newState.guild; const user = who(newState.member?.user); if (!oldState.channelId && newState.channelId) send(guild, 'voz_entrada', embed('Entrada em voz', `${user} entrou em ${newState.channel}.`, COLORS.good)); else if (oldState.channelId && !newState.channelId) send(guild, 'voz_saida', embed('Saída da voz', `${user} saiu de ${oldState.channel?.name || 'uma call'}.`, COLORS.bad)); else if (oldState.channelId !== newState.channelId) send(guild, 'voz_mudanca', embed('Mudança de voz', `${user} mudou de call.`, COLORS.info)); });
 client.on(Events.InviteCreate, invite => invite.guild && send(invite.guild, 'convite_criado', embed('Convite criado', `Código: ${invite.code} | Criado por: ${who(invite.inviter)}.`, COLORS.good)));
 client.on(Events.InviteDelete, invite => invite.guild && send(invite.guild, 'convite_excluido', embed('Convite excluído', `Código: ${invite.code}`, COLORS.bad)));
 client.on(Events.InteractionCreate, interaction => { if (!interaction.guild || !interaction.isButton?.()) return; if (interaction.customId === 'ticket_claim') send(interaction.guild, 'ticket_assumido', embed('Ticket assumido', `${who(interaction.user)} assumiu ${interaction.channel}.`, COLORS.info)); if (interaction.customId === 'ticket_close') send(interaction.guild, 'ticket_fechado', embed('Ticket fechado', `${who(interaction.user)} fechou ${interaction.channel}.`, COLORS.bad)); });
}
module.exports = { EVENTS, install, ensure, configFor, setChannel, status, send };
