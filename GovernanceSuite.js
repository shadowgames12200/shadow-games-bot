const { Events, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { db, save } = require('./ProfessionalSuite');

const windows = new Map();
function ensure() {
  db.automod ||= {};
  Object.assign(db.automod, { enabled: true, blockedWords: [], maxMentions: 5, maxLinksPerMessage: 3, spamWindowSeconds: 10, spamMaxMessages: 6, inviteLinks: true, exemptions: { channels: [], roles: [] }, punish: 'timeout' }, db.automod);
  db.audit ||= { events: [], max: 1000 };
  db.starboard ||= {};
  save();
}
async function audit(client, guild, type, data, color = 0x5865f2) {
  db.audit.events.push({ type, at: new Date().toISOString(), guildId: guild.id, ...data });
  if (db.audit.events.length > Number(db.audit.max || 1000)) db.audit.events.splice(0, db.audit.events.length - Number(db.audit.max || 1000));
  save();
  const id = db.settings.logChannelId; if (!id) return;
  const channel = await guild.channels.fetch(id).catch(() => null);
  if (channel?.isTextBased()) await channel.send({ embeds: [new EmbedBuilder().setColor(color).setTitle(type).setDescription(Object.entries(data).map(([k, v]) => `**${k}:** ${String(v).slice(0, 500)}`).join('\n')).setTimestamp()] }).catch(() => {});
}
function exempt(message) { return message.channel && db.automod.exemptions?.channels?.includes(message.channel.id) || message.member?.roles.cache.some(r => db.automod.exemptions?.roles?.includes(r.id)); }
function inspect(message) {
  const text = message.content || ''; const lower = text.toLowerCase(); const now = Date.now(); const key = `${message.guildId}:${message.author.id}`; const entry = windows.get(key) || { times: [], hashes: [] };
  entry.times = entry.times.filter(t => now - t < Number(db.automod.spamWindowSeconds || 10) * 1000); entry.times.push(now); windows.set(key, entry);
  const links = (text.match(/https?:\/\/\S+/gi) || []).length;
  const hasInvite = /discord(?:\.gg|\.com\/invite)\/\S+/i.test(text);
  const blocked = (db.automod.blockedWords || []).some(w => w && lower.includes(String(w).toLowerCase()));
  const spam = entry.times.length > Number(db.automod.spamMaxMessages || 6);
  return { blocked, mentions: (message.mentions?.users?.size || 0) > Number(db.automod.maxMentions || 5), links: links > Number(db.automod.maxLinksPerMessage || 3), invite: db.automod.inviteLinks && hasInvite, spam };
}
async function moderate(message, client) {
  if (!db.automod.enabled || exempt(message)) return false;
  const reasons = inspect(message); const keys = Object.entries(reasons).filter(([, v]) => v).map(([k]) => k); if (!keys.length) return false;
  await message.delete().catch(() => {}); await audit(client, message.guild, 'AutoMod acionado', { usuario: message.author.tag, canal: message.channel.name, regras: keys.join(', ') }, 0xed4245);
  if (db.automod.punish === 'timeout' && message.member?.moderatable) await message.member.timeout(10 * 60 * 1000, `AutoMod: ${keys.join(', ')}`).catch(() => {});
  return true;
}
async function updateStarboard(reaction) {
  if (reaction.emoji.name !== '⭐' || !db.settings.starboardChannelId) return;
  const key = reaction.message.id; const count = reaction.count || 0; const threshold = Number(db.settings.starboardThreshold || 3); const target = await reaction.message.guild.channels.fetch(db.settings.starboardChannelId).catch(() => null); if (!target?.isTextBased()) return;
  const existing = db.starboard[key];
  if (count < threshold) { if (existing?.messageId) await target.messages.delete(existing.messageId).catch(() => {}); if (existing) { delete db.starboard[key]; save(); } return; }
  const embed = new EmbedBuilder().setColor(0xfee75c).setAuthor({ name: reaction.message.author?.tag || 'Usuário', iconURL: reaction.message.author?.displayAvatarURL?.() }).setDescription(`${reaction.message.content || '*sem texto*'}\n\n[Ir para a mensagem](${reaction.message.url})`).setFooter({ text: `⭐ ${count} · ${reaction.message.channel.name}` });
  if (existing?.messageId) { const sent = await target.messages.fetch(existing.messageId).catch(() => null); if (sent) { await sent.edit({ embeds: [embed] }).catch(() => {}); existing.count = count; save(); return; } }
  const sent = await target.send({ embeds: [embed] }).catch(() => null); if (sent) { db.starboard[key] = { messageId: sent.id, count }; save(); }
}
function install(client) {
  ensure();
  client.on(Events.MessageCreate, async message => { if (!message.guild || message.author.bot) return; await moderate(message, client); });
  for (const [event, title, color] of [[Events.GuildMemberAdd, 'Membro entrou', 0x57f287], [Events.GuildMemberRemove, 'Membro saiu', 0xed4245], [Events.ChannelCreate, 'Canal criado', 0x57f287], [Events.ChannelDelete, 'Canal removido', 0xed4245], [Events.RoleCreate, 'Cargo criado', 0x57f287], [Events.RoleDelete, 'Cargo removido', 0xed4245]]) client.on(event, item => { const guild = item.guild; if (guild) audit(client, guild, title, { nome: item.user?.tag || item.name || item.id }, color); });
  client.on(Events.MessageReactionAdd, reaction => updateStarboard(reaction).catch(() => {}));
  client.on(Events.MessageReactionRemove, reaction => updateStarboard(reaction).catch(() => {}));
}
module.exports = { install, ensure, inspect, audit };
