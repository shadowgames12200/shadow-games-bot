const { Events, EmbedBuilder, PermissionFlagsBits, AuditLogEvent } = require('discord.js');
const { db, save } = require('./ProfessionalSuite');

const COLORS = { main: '#7c3aed', good: '#22c55e', bad: '#ef4444', info: '#3b82f6', warn: '#f59e0b' };
const ALIASES = { membros: 'members', mensagens: 'messages', tickets: 'tickets', voz: 'voice', canais: 'channels', cargos: 'roles', convites: 'invites', moderacao: 'moderation', servidor: 'server', threads: 'threads', members: 'members', messages: 'messages', voice: 'voice', channels: 'channels', roles: 'roles', invites: 'invites', moderation: 'moderation', server: 'server' };

function groupKey(group) { return ALIASES[String(group || '').toLowerCase()] || String(group || '').toLowerCase(); }
function ensure() { db.serverLogs ||= {}; }
function configFor(guildId) {
  ensure();
  db.serverLogs[guildId] ||= { channelId: '', enabled: true, channels: {}, events: { members: true, messages: true, channels: true, roles: true, voice: true, moderation: true, invites: true, tickets: true, server: true, threads: true } };
  db.serverLogs[guildId].channels ||= {};
  return db.serverLogs[guildId];
}
function setChannel(guildId, group, channelId) {
  const config = configFor(guildId);
  const key = groupKey(group);
  if (channelId) config.channels[key] = channelId; else delete config.channels[key];
  save();
  return config;
}
function status(guildId) { const config = configFor(guildId); return { ...config, channels: { ...config.channels }, events: { ...config.events } }; }
function enabled(guildId, group) { const config = configFor(guildId); return config.enabled !== false && config.events?.[groupKey(group)] !== false; }
async function channelFor(guild, group) {
  if (!guild || !enabled(guild.id, group)) return null;
  const config = configFor(guild.id);
  const id = config.channels[groupKey(group)] || config.channelId;
  if (!id) return null;
  const channel = guild.channels.cache.get(id) || await guild.channels.fetch(id).catch(() => null);
  return channel?.isTextBased() ? channel : null;
}
const clean = (value, max = 900) => String(value ?? 'Sem conteúdo').trim().slice(0, max) || 'Sem conteúdo';
const who = user => user ? `${user.tag || user.username} (<@${user.id}>)` : 'Desconhecido';
function embed(title, description, color = COLORS.main) { return new EmbedBuilder().setColor(color).setTitle(title).setDescription(clean(description, 4000)).setTimestamp(); }
async function send(guild, group, message) { const channel = await channelFor(guild, group); if (channel) await channel.send({ embeds: [message] }).catch(() => {}); }
function ticket(channel) { return String(channel?.topic || '').startsWith('ticket:'); }
async function install(client) {
  client.on(Events.GuildMemberAdd, member => send(member.guild, 'members', embed('Membro entrou', `${member} entrou no servidor.`, COLORS.good)));
  client.on(Events.GuildMemberRemove, async member => { const logs = await member.guild.fetchAuditLogs({ type: AuditLogEvent.MemberKick, limit: 5 }).catch(() => null); const kicked = logs?.entries.some(entry => entry.target?.id === member.id); send(member.guild, 'members', embed(kicked ? 'Membro expulso' : 'Membro saiu', `${who(member.user)}${kicked ? ' foi expulso.' : ' deixou o servidor.'}`, COLORS.bad)); });
  client.on(Events.GuildBanAdd, ban => send(ban.guild, 'moderation', embed('Membro banido', who(ban.user), COLORS.bad)));
  client.on(Events.GuildBanRemove, ban => send(ban.guild, 'moderation', embed('Banimento removido', who(ban.user), COLORS.good)));
  client.on(Events.MessageDelete, message => { if (!message.guild || message.author?.bot) return; send(message.guild, ticket(message.channel) ? 'tickets' : 'messages', embed('Mensagem apagada', `Canal: ${message.channel}
Autor: ${who(message.author)}
Conteúdo: ${clean(message.content)}`, COLORS.bad)); });
  client.on(Events.MessageBulkDelete, (messages, channel) => channel.guild && send(channel.guild, ticket(channel) ? 'tickets' : 'messages', embed('Mensagens apagadas em massa', `${messages.size} mensagens apagadas em ${channel}.`, COLORS.bad)));
  client.on(Events.MessageUpdate, (oldMessage, newMessage) => { if (!newMessage.guild || newMessage.author?.bot || oldMessage.content === newMessage.content) return; send(newMessage.guild, ticket(newMessage.channel) ? 'tickets' : 'messages', embed('Mensagem editada', `Canal: ${newMessage.channel}
Autor: ${who(newMessage.author)}
Antes: ${clean(oldMessage.content)}
Depois: ${clean(newMessage.content)}`, COLORS.warn)); });
  client.on(Events.ChannelCreate, channel => channel.guild && send(channel.guild, ticket(channel) ? 'tickets' : 'channels', embed('Canal criado', `${channel}
Nome: ${channel.name}`, COLORS.good)));
  client.on(Events.ChannelDelete, channel => channel.guild && send(channel.guild, ticket(channel) ? 'tickets' : 'channels', embed('Canal apagado', `Nome: ${channel.name}`, COLORS.bad)));
  client.on(Events.RoleCreate, role => send(role.guild, 'roles', embed('Cargo criado', `Cargo: ${role.name}`, COLORS.good)));
  client.on(Events.RoleDelete, role => send(role.guild, 'roles', embed('Cargo apagado', `Cargo: ${role.name}`, COLORS.bad)));
  client.on(Events.VoiceStateUpdate, (oldState, newState) => { const guild = newState.guild; if (!oldState.channelId && newState.channelId) send(guild, 'voice', embed('Entrada em call', `${who(newState.member?.user)} entrou em ${newState.channel}.`, COLORS.good)); else if (oldState.channelId && !newState.channelId) send(guild, 'voice', embed('Saída da call', `${who(newState.member?.user)} saiu de ${oldState.channel?.name || 'uma call'}.`, COLORS.bad)); else if (oldState.channelId !== newState.channelId) send(guild, 'voice', embed('Mudança de call', `${who(newState.member?.user)} mudou de call.`, COLORS.info)); });
  client.on(Events.InviteCreate, invite => invite.guild && send(invite.guild, 'invites', embed('Convite criado', `Código: ${invite.code}
Criado por: ${who(invite.inviter)}.`, COLORS.good)));
  client.on(Events.InviteDelete, invite => invite.guild && send(invite.guild, 'invites', embed('Convite apagado', `Código: ${invite.code}`, COLORS.bad)));
  client.on(Events.ThreadCreate, thread => send(thread.guild, 'threads', embed('Thread criada', thread.name, COLORS.good)));
  client.on(Events.ThreadDelete, thread => send(thread.guild, 'threads', embed('Thread apagada', thread.name, COLORS.bad)));
  client.on(Events.InteractionCreate, interaction => { if (interaction.guild && interaction.isButton?.() && /^ticket_(claim|close|notify|rate_)/.test(interaction.customId)) send(interaction.guild, 'tickets', embed('Ação em ticket', `Ação: ${interaction.customId}
Usuário: ${who(interaction.user)}
Canal: ${interaction.channel}`)); });
}
module.exports = { install, ensure, configFor, setChannel, status, send };
