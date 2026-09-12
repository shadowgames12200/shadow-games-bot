const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  PermissionFlagsBits,
  ChannelType,
} = require('discord.js');
const { configuracao } = require('./DataBaseJson');


const DEFAULTS = {
  enabled: true,
  verificationEnabled: false,
  verificationChannelId: null,
  memberRoleId: null,
  quarantineRoleId: null,
  raidChannelId: null,
  logChannelId: null,
  blockBots: false,
  antiRaid: true,
  raidWindowMs: 30_000,
  raidJoinLimit: 6,
  antiSpam: true,
  spamWindowMs: 8_000,
  spamLimit: 6,
};


const joins = new Map();
const messages = new Map();


function getConfig(guildId) {
  return { ...DEFAULTS, ...(configuracao.get(`Security.${guildId}`) || {}) };
}


function setConfig(guildId, patch) {
  configuracao.set(`Security.${guildId}`, { ...getConfig(guildId), ...patch });
  return getConfig(guildId);
}


function isStaff(member) {
  return member?.permissions?.has(PermissionFlagsBits.Administrator) ||
    member?.permissions?.has(PermissionFlagsBits.ManageGuild) ||
    member?.permissions?.has(PermissionFlagsBits.ManageMessages);
}


async function log(client, guild, content, color = 0xf1c40f) {
  const cfg = getConfig(guild.id);
  if (!cfg.logChannelId) return;
  try {
    const channel = await client.channels.fetch(cfg.logChannelId);
    if (channel?.isTextBased()) {
      await channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(content).setTimestamp()] });
    }
  } catch (error) {
    console.error('[Security] Falha ao enviar log:', error.message);
  }
}


function trimMap(map, now, maxAge) {
  for (const [key, values] of map) {
    const fresh = values.filter((timestamp) => now - timestamp <= maxAge);
    if (fresh.length) map.set(key, fresh);
    else map.delete(key);
  }
}


async function safeKick(member, reason) {
  if (!member?.kickable) return false;
  await member.kick(reason);
  return true;
}


async function applyQuarantine(member, cfg) {
  if (!cfg.quarantineRoleId) return;
  const role = member.guild.roles.cache.get(cfg.quarantineRoleId) || await member.guild.roles.fetch(cfg.quarantineRoleId).catch(() => null);
  if (role && member.manageable) await member.roles.add(role, 'Aguardando verificaÃ§Ã£o').catch(() => {});
}


async function handleMemberJoin(member, client) {
  const cfg = getConfig(member.guild.id);
  if (!cfg.enabled) return;


  const now = Date.now();
  const recent = (joins.get(member.guild.id) || []).filter((t) => now - t <= cfg.raidWindowMs);
  recent.push(now);
  joins.set(member.guild.id, recent);


  if (cfg.blockBots && member.user.bot && !isStaff(member)) {
    const kicked = await safeKick(member, 'Bot bloqueado pela proteÃ§Ã£o do servidor').catch(() => false);
    await log(client, member.guild, `ðŸ¤– Bot **${member.user.tag}** ${kicked ? 'foi expulso' : 'nÃ£o pÃ´de ser expulso'} automaticamente.`, 0xe74c3c);
    return;
  }


  if (cfg.antiRaid && recent.length >= cfg.raidJoinLimit) {
    await log(client, member.guild, `ðŸš¨ PossÃ­vel raid detectada: **${recent.length} entradas** em ${cfg.raidWindowMs / 1000}s.`, 0xe74c3c);
  }


  if (cfg.verificationEnabled) await applyQuarantine(member, cfg);
}


async function handleMessage(message, client) {
  if (!message.guild || message.author.bot) return;
  const cfg = getConfig(message.guild.id);
  if (!cfg.enabled) return;


  if (cfg.raidChannelId === message.channel.id && cfg.verificationChannelId !== message.channel.id && !isStaff(message.member)) {
    await message.delete().catch(() => {});
    const kicked = await safeKick(message.member, 'Mensagem enviada no canal reservado de proteÃ§Ã£o').catch(() => false);
    await log(client, message.guild, `ðŸš¨ ${message.author} enviou mensagem em <#${message.channel.id}> e ${kicked ? 'foi expulso' : 'nÃ£o pÃ´de ser expulso'}.`, 0xe74c3c);
    return;
  }


  if (!cfg.antiSpam || isStaff(message.member)) return;
  const now = Date.now();
  const key = `${message.guild.id}:${message.author.id}`;
  const recent = (messages.get(key) || []).filter((t) => now - t <= cfg.spamWindowMs);
  recent.push(now);
  messages.set(key, recent);
  if (recent.length >= cfg.spamLimit) {
    messages.delete(key);
    await message.member.timeout(60_000, 'Anti-spam automÃ¡tico').catch(() => {});
    await log(client, message.guild, `ðŸ›¡ï¸ ${message.author} recebeu timeout de 1 minuto por spam.`, 0xe67e22);
  }
  trimMap(messages, now, cfg.spamWindowMs);
}


async function handleInteraction(interaction, client) {
  if (!interaction.isButton() || interaction.customId !== 'sg_verify') return;
  const cfg = getConfig(interaction.guild.id);
  if (interaction.channelId !== cfg.verificationChannelId) return interaction.reply({ content: 'Use o painel no canal de verificaÃ§Ã£o configurado.', ephemeral: true });
  if (!cfg.verificationEnabled || !cfg.memberRoleId) {
    return interaction.reply({ content: 'A verificaÃ§Ã£o ainda nÃ£o foi configurada.', ephemeral: true });
  }
  const role = interaction.guild.roles.cache.get(cfg.memberRoleId) || await interaction.guild.roles.fetch(cfg.memberRoleId).catch(() => null);
  if (!role) return interaction.reply({ content: 'O cargo de membro configurado nÃ£o existe mais.', ephemeral: true });
  const member = await interaction.guild.members.fetch(interaction.user.id);
  if (!member.manageable && role.position >= interaction.guild.members.me.roles.highest.position) {
    return interaction.reply({ content: 'O bot nÃ£o consegue gerenciar esse cargo. Coloque o cargo do bot acima do cargo Membro.', ephemeral: true });
  }
  await member.roles.add(role, 'VerificaÃ§Ã£o concluÃ­da').catch(() => null);
  if (cfg.quarantineRoleId) await member.roles.remove(cfg.quarantineRoleId, 'VerificaÃ§Ã£o concluÃ­da').catch(() => {});
  await log(client, interaction.guild, `âœ… ${interaction.user} concluiu a verificaÃ§Ã£o.`, 0x2ecc71);
  await interaction.reply({ content: 'âœ… VerificaÃ§Ã£o concluÃ­da. Seu acesso foi liberado!', ephemeral: true });
  setTimeout(() => interaction.deleteReply().catch(() => {}), 15_000);
}


async function install(client) {
  client.on('guildMemberAdd', (member) => handleMemberJoin(member, client).catch((e) => console.error('[Security] guildMemberAdd:', e)));
  client.on('messageCreate', (message) => handleMessage(message, client).catch((e) => console.error('[Security] messageCreate:', e)));
  client.on('interactionCreate', (interaction) => handleInteraction(interaction, client).catch((e) => console.error('[Security] interactionCreate:', e)));
  client.once('ready', () => console.log('[Security] suÃ­te de seguranÃ§a carregada.'));
}


async function postVerificationPanel(channel) {
  const embed = new EmbedBuilder()
    .setColor(0x2ecc71)
    .setTitle('âœ… VerificaÃ§Ã£o do servidor')
    .setDescription('Clique no botÃ£o abaixo para confirmar que vocÃª Ã© uma pessoa e liberar o acesso ao servidor.');
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('sg_verify').setLabel('Verificar').setStyle(ButtonStyle.Success)
  );
  return channel.send({ embeds: [embed], components: [row] });
}


module.exports = {
  DEFAULTS,
  getConfig,
  setConfig,
  install,
  postVerificationPanel,
  applyQuarantine,
};
