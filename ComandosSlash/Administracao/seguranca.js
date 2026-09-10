const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
} = require('discord.js');
const {
  getConfig,
  setConfig,
  postVerificationPanel,
} = require('../../SecuritySuite');

const data = new SlashCommandBuilder()
  .setName('seguranca')
  .setDescription('Configura verificação, anti-raid, anti-spam e logs')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild.toString())
  .addSubcommand((s) => s
    .setName('configurar')
    .setDescription('Define os canais e cargos de segurança')
    .addChannelOption((o) => o.setName('verificacao').setDescription('Canal onde os membros verificam').addChannelTypes(ChannelType.GuildText))
    .addChannelOption((o) => o.setName('raid').setDescription('Canal reservado: mensagens causam expulsão').addChannelTypes(ChannelType.GuildText))
    .addChannelOption((o) => o.setName('logs').setDescription('Canal para logs de segurança').addChannelTypes(ChannelType.GuildText))
    .addRoleOption((o) => o.setName('membro').setDescription('Cargo entregue após verificar'))
    .addRoleOption((o) => o.setName('quarentena').setDescription('Cargo opcional para não ver o servidor antes de verificar'))
    .addBooleanOption((o) => o.setName('bloquear_bots').setDescription('Expulsar bots que entrarem no servidor')))
  .addSubcommand((s) => s
    .setName('painel')
    .setDescription('Publica o painel de verificação neste canal'))
  .addSubcommand((s) => s
    .setName('status')
    .setDescription('Mostra a configuração atual de segurança'));

module.exports = {
  name: 'seguranca',
  description: 'Configura recursos de proteção do servidor',
  type: 1,
  data,
  run: async (_client, interaction) => {
    if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild)) {
      return interaction.reply({ content: '❌ Você precisa de Gerenciar Servidor.', ephemeral: true });
    }
    const sub = interaction.options.getSubcommand();
    let cfg = getConfig(interaction.guildId);

    if (sub === 'configurar') {
      const patch = {};
      const verification = interaction.options.getChannel('verificacao');
      const raid = interaction.options.getChannel('raid');
      const logs = interaction.options.getChannel('logs');
      const member = interaction.options.getRole('membro');
      const quarantine = interaction.options.getRole('quarentena');
      const blockBots = interaction.options.getBoolean('bloquear_bots');
      if (verification) { patch.verificationChannelId = verification.id; patch.verificationEnabled = true; }
      if (raid) patch.raidChannelId = raid.id;
      if (logs) patch.logChannelId = logs.id;
      if (member) patch.memberRoleId = member.id;
      if (quarantine) patch.quarantineRoleId = quarantine.id;
      if (blockBots !== null) patch.blockBots = blockBots;
      cfg = setConfig(interaction.guildId, patch);
      return interaction.reply({ content: `✅ Segurança atualizada. Verificação: **${cfg.verificationEnabled ? 'ativa' : 'inativa'}** | Anti-raid: **${cfg.antiRaid ? 'ativo' : 'inativo'}** | Anti-spam: **${cfg.antiSpam ? 'ativo' : 'inativo'}**`, ephemeral: true });
    }

    if (sub === 'painel') {
      cfg = setConfig(interaction.guildId, { verificationChannelId: interaction.channelId, verificationEnabled: true });
      await postVerificationPanel(interaction.channel);
      return interaction.reply({ content: '✅ Painel de verificação publicado e este canal foi definido como canal de verificação.', ephemeral: true });
    }

    return interaction.reply({
      content: [
        `**Segurança do servidor**`,
        `Verificação: ${cfg.verificationEnabled ? '✅ ativa' : '❌ inativa'}`,
        `Anti-raid: ${cfg.antiRaid ? '✅ ativo' : '❌ inativo'}`,
        `Anti-spam: ${cfg.antiSpam ? '✅ ativo' : '❌ inativo'}`,
        `Bloquear bots: ${cfg.blockBots ? '✅ sim' : '❌ não'}`,
        `Canal de verificação: ${cfg.verificationChannelId ? `<#${cfg.verificationChannelId}>` : 'não definido'}`,
        `Canal reservado: ${cfg.raidChannelId ? `<#${cfg.raidChannelId}>` : 'não definido'}`,
        `Cargo Membro: ${cfg.memberRoleId ? `<@&${cfg.memberRoleId}>` : 'não definido'}`,
        `Canal de logs: ${cfg.logChannelId ? `<#${cfg.logChannelId}>` : 'não definido'}`,
      ].join('\n'),
      ephemeral: true,
    });
  },
};
