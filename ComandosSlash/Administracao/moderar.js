const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { addWarning, clearWarnings, getWarnings } = require('../../ProductionSuite');

const data = new SlashCommandBuilder()
  .setName('moderar')
  .setDescription('Executa ações de moderação no servidor')
  .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers.toString())
  .addSubcommand(s => s.setName('timeout').setDescription('Coloca um membro em timeout')
    .addUserOption(o => o.setName('usuario').setDescription('Membro').setRequired(true))
    .addIntegerOption(o => o.setName('minutos').setDescription('Duração em minutos').setMinValue(1).setMaxValue(40320).setRequired(true))
    .addStringOption(o => o.setName('motivo').setDescription('Motivo').setMaxLength(500)))
  .addSubcommand(s => s.setName('expulsar').setDescription('Expulsa um membro')
    .addUserOption(o => o.setName('usuario').setDescription('Membro').setRequired(true))
    .addStringOption(o => o.setName('motivo').setDescription('Motivo').setMaxLength(500)))
  .addSubcommand(s => s.setName('banir').setDescription('Bane um membro')
    .addUserOption(o => o.setName('usuario').setDescription('Membro').setRequired(true))
    .addStringOption(o => o.setName('motivo').setDescription('Motivo').setMaxLength(500)))
  .addSubcommand(s => s.setName('limpar').setDescription('Apaga mensagens recentes')
    .addIntegerOption(o => o.setName('quantidade').setDescription('Quantidade').setMinValue(1).setMaxValue(100).setRequired(true)))
  .addSubcommand(s => s.setName('advertir').setDescription('Registra uma advertência')
    .addUserOption(o => o.setName('usuario').setDescription('Membro').setRequired(true))
    .addStringOption(o => o.setName('motivo').setDescription('Motivo').setRequired(true).setMaxLength(500)))
  .addSubcommand(s => s.setName('historico').setDescription('Consulta advertências')
    .addUserOption(o => o.setName('usuario').setDescription('Membro').setRequired(true)))
  .addSubcommand(s => s.setName('limpar-advertencias').setDescription('Remove advertências')
    .addUserOption(o => o.setName('usuario').setDescription('Membro').setRequired(true)));

module.exports = {
  name: 'moderar',
  description: 'Executa ações de moderação',
  type: 1,
  data,
  run: async (_client, interaction) => {
    const sub = interaction.options.getSubcommand();
    if (sub === 'limpar') {
      if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageMessages)) return interaction.reply({ content: '❌ Você precisa de Gerenciar Mensagens.', ephemeral: true });
      const deleted = await interaction.channel.bulkDelete(interaction.options.getInteger('quantidade'), true).catch(() => null);
      return interaction.reply({ content: deleted ? `✅ ${deleted.size} mensagens apagadas.` : '❌ Não foi possível apagar as mensagens.', ephemeral: true });
    }
    if (sub === 'advertir') { if (!interaction.memberPermissions.has(PermissionFlagsBits.ModerateMembers)) return interaction.reply({ content: '❌ Você precisa de Moderar Membros.', ephemeral: true }); const user = interaction.options.getUser('usuario'); const item = addWarning(interaction.guildId, user.id, interaction.user.id, interaction.options.getString('motivo')); return interaction.reply(`⚠️ ${user} recebeu uma advertência. Total ativo: ${getWarnings(interaction.guildId, user.id).filter(x => x.active).length}.`); }
    if (sub === 'historico') { const user = interaction.options.getUser('usuario'); const list = getWarnings(interaction.guildId, user.id); return interaction.reply({ content: list.length ? list.map((x, i) => `${i + 1}. ${x.reason} — <t:${Math.floor(new Date(x.at).getTime() / 1000)}:R>`).join('\n').slice(0, 1900) : 'Nenhuma advertência.', ephemeral: true }); }
    if (sub === 'limpar-advertencias') { if (!interaction.memberPermissions.has(PermissionFlagsBits.ModerateMembers)) return interaction.reply({ content: '❌ Você precisa de Moderar Membros.', ephemeral: true }); const user = interaction.options.getUser('usuario'); clearWarnings(interaction.guildId, user.id); return interaction.reply({ content: `✅ Advertências de ${user} removidas.`, ephemeral: true }); }
    const user = interaction.options.getUser('usuario'); const member = await interaction.guild.members.fetch(user.id).catch(() => null); if (!member) return interaction.reply({ content: '❌ Membro não encontrado.', ephemeral: true });
    const reason = interaction.options.getString('motivo') || `Ação por ${interaction.user.tag}`;
    if (sub === 'timeout') { if (!interaction.memberPermissions.has(PermissionFlagsBits.ModerateMembers)) return interaction.reply({ content: '❌ Você precisa de Moderar Membros.', ephemeral: true }); const minutes = interaction.options.getInteger('minutos'); await member.timeout(minutes * 60000, reason); return interaction.reply(`✅ ${user} recebeu timeout de ${minutes} minuto(s).`); }
    if (sub === 'expulsar') { if (!interaction.memberPermissions.has(PermissionFlagsBits.KickMembers)) return interaction.reply({ content: '❌ Você precisa de Expulsar Membros.', ephemeral: true }); await member.kick(reason); return interaction.reply(`✅ ${user.tag} foi expulso.`); }
    if (sub === 'banir') { if (!interaction.memberPermissions.has(PermissionFlagsBits.BanMembers)) return interaction.reply({ content: '❌ Você precisa de Banir Membros.', ephemeral: true }); await member.ban({ reason }); return interaction.reply(`✅ ${user.tag} foi banido.`); }
  }
};
