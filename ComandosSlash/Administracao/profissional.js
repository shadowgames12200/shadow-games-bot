const {
  SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder,
  ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType
} = require('discord.js');
const { db, save } = require('../../ProfessionalSuite');
const payments = require('../../PaymentProviders');

const command = new SlashCommandBuilder()
  .setName('profissional')
  .setDescription('Configura os recursos profissionais do servidor')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild.toString())
  .addSubcommand(sub => sub.setName('status').setDescription('Mostra o status e as estatísticas da suíte'))
  .addSubcommand(sub => sub.setName('canal').setDescription('Define um canal de um recurso')
    .addStringOption(o => o.setName('tipo').setDescription('Recurso').setRequired(true).addChoices(
      { name: 'Logs', value: 'logChannelId' }, { name: 'Starboard', value: 'starboardChannelId' },
      { name: 'Sugestões', value: 'suggestionChannelId' }, { name: 'Boas-vindas', value: 'welcomeChannelId' },
      { name: 'Despedidas', value: 'goodbyeChannelId' }
    ))
    .addChannelOption(o => o.setName('canal').setDescription('Canal de texto').addChannelTypes(ChannelType.GuildText).setRequired(true)))
  .addSubcommand(sub => sub.setName('starboard').setDescription('Configura o canal e a quantidade de estrelas')
    .addChannelOption(o => o.setName('canal').setDescription('Canal do starboard').addChannelTypes(ChannelType.GuildText).setRequired(true))
    .addIntegerOption(o => o.setName('minimo').setDescription('Estrelas necessárias').setMinValue(1).setMaxValue(50).setRequired(true)))
  .addSubcommand(sub => sub.setName('reaction-role').setDescription('Vincula uma reação de uma mensagem a um cargo')
    .addChannelOption(o => o.setName('canal').setDescription('Canal da mensagem').addChannelTypes(ChannelType.GuildText).setRequired(true))
    .addStringOption(o => o.setName('mensagem').setDescription('ID da mensagem').setRequired(true))
    .addStringOption(o => o.setName('emoji').setDescription('Emoji Unicode ou ID do emoji').setRequired(true))
    .addRoleOption(o => o.setName('cargo').setDescription('Cargo que será atribuído').setRequired(true)))
  .addSubcommand(sub => sub.setName('sugestao').setDescription('Publica uma sugestão com botões de aprovação')
    .addStringOption(o => o.setName('texto').setDescription('Texto da sugestão').setRequired(true).setMaxLength(1900)) )
  .addSubcommand(sub => sub.setName('tickets').setDescription('Configura categoria, equipe, inatividade e SLA')
    .addChannelOption(o => o.setName('categoria').setDescription('Categoria dos tickets').addChannelTypes(ChannelType.GuildCategory))
    .addRoleOption(o => o.setName('equipe').setDescription('Cargo da equipe de atendimento'))
    .addIntegerOption(o => o.setName('inatividade_horas').setDescription('Horas até fechamento automático').setMinValue(1).setMaxValue(8760))
    .addIntegerOption(o => o.setName('sla_horas').setDescription('Prazo de primeira resposta').setMinValue(1).setMaxValue(8760)))
  .addSubcommand(sub => sub.setName('automod').setDescription('Configura o AutoMod')
    .addBooleanOption(o => o.setName('ativo').setDescription('Ativar ou desativar'))
    .addStringOption(o => o.setName('palavras_bloqueadas').setDescription('Palavras separadas por vírgula'))
    .addIntegerOption(o => o.setName('max_mencoes').setDescription('Máximo de menções').setMinValue(1).setMaxValue(50))
    .addIntegerOption(o => o.setName('max_links').setDescription('Máximo de links por mensagem').setMinValue(1).setMaxValue(50))
    .addIntegerOption(o => o.setName('janela_spam').setDescription('Janela anti-spam em segundos').setMinValue(3).setMaxValue(120))
    .addIntegerOption(o => o.setName('max_mensagens').setDescription('Mensagens permitidas na janela').setMinValue(2).setMaxValue(50))
    .addBooleanOption(o => o.setName('bloquear_convites').setDescription('Bloquear convites Discord'))) 
  .addSubcommand(sub => sub.setName('comando').setDescription('Cria ou atualiza um comando personalizado')
    .addStringOption(o => o.setName('nome').setDescription('Nome sem o !').setRequired(true).setMaxLength(32))
    .addStringOption(o => o.setName('resposta').setDescription('Resposta do bot; use {user} para mencionar').setRequired(true).setMaxLength(1900)))
  .addSubcommand(sub => sub.setName('permissao').setDescription('Define cargos autorizados para uma operação')
    .addStringOption(o => o.setName('operacao').setDescription('Operação protegida').setRequired(true).addChoices(
      { name: 'Fechar ticket', value: 'closeTicket' }, { name: 'Assumir ticket', value: 'claimTicket' }, { name: 'Moderar sugestões', value: 'moderateSuggestions' }, { name: 'Ver transcripts', value: 'viewTranscripts' }, { name: 'Gerenciar AutoMod', value: 'manageAutoMod' }
    ))
    .addRoleOption(o => o.setName('cargo').setDescription('Cargo autorizado').setRequired(true)))
  .addSubcommand(sub => sub.setName('painel-ticket').setDescription('Publica o botão para abertura de tickets')
    .addChannelOption(o => o.setName('canal').setDescription('Canal onde o painel será publicado').addChannelTypes(ChannelType.GuildText).setRequired(true)))
  .addSubcommand(sub => sub.setName('equipe').setDescription('Cria ou atualiza uma equipe de atendimento')
    .addStringOption(o => o.setName('chave').setDescription('Identificador curto, como vendas ou suporte').setRequired(true).setMaxLength(24))
    .addStringOption(o => o.setName('nome').setDescription('Nome exibido da equipe').setRequired(true).setMaxLength(80))
    .addRoleOption(o => o.setName('cargo').setDescription('Cargo da equipe').setRequired(true))
    .addChannelOption(o => o.setName('categoria').setDescription('Categoria dos tickets').addChannelTypes(ChannelType.GuildCategory)))
  .addSubcommand(sub => sub.setName('formulario').setDescription('Cria perguntas para uma equipe')
    .addStringOption(o => o.setName('equipe').setDescription('Chave da equipe').setRequired(true))
    .addStringOption(o => o.setName('titulo').setDescription('Título do formulário').setRequired(true).setMaxLength(45))
    .addStringOption(o => o.setName('perguntas').setDescription('Até 5 perguntas separadas por |').setRequired(true).setMaxLength(500)))
  .addSubcommand(sub => sub.setName('painel-equipe').setDescription('Publica um painel de uma equipe específica')
    .addChannelOption(o => o.setName('canal').setDescription('Canal do painel').addChannelTypes(ChannelType.GuildText).setRequired(true))
    .addStringOption(o => o.setName('equipe').setDescription('Chave da equipe').setRequired(true)))
  .addSubcommand(sub => sub.setName('pagamento').setDescription('Seleciona o provedor de pagamento em tempo de execução')
    .addStringOption(o => o.setName('provedor').setDescription('Provedor').setRequired(true).addChoices(
      { name: 'Efí Bank', value: 'efi' }, { name: 'Banco Inter', value: 'inter' }, { name: 'Banco do Brasil', value: 'bb' }, { name: 'Asaas', value: 'asaas' }
    ))
    .addStringOption(o => o.setName('modo').setDescription('Ambiente').setRequired(true).addChoices({ name: 'Sandbox/Teste', value: 'sandbox' }, { name: 'Produção', value: 'production' })));

function isAdmin(interaction) { return interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild) || interaction.memberPermissions?.has(PermissionFlagsBits.Administrator); }

module.exports = {
  name: 'profissional',
  description: 'Configura os recursos profissionais do servidor',
  type: 1,
  data: command,
  run: async (_client, interaction) => {
    if (!isAdmin(interaction)) return interaction.reply({ content: '❌ Você precisa de Gerenciar Servidor.', ephemeral: true });
    const sub = interaction.options.getSubcommand();
    if (sub === 'status') {
      const s = db.stats; const m = db.supportMetrics || { firstResponseMs: [], resolutionMs: [] }; const avg = values => values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length / 60000) : 0; return interaction.reply({ ephemeral: true, embeds: [new EmbedBuilder().setColor(0x5865f2).setTitle('Shadow Games · Suíte profissional').setDescription(`Tickets abertos: **${s.opened}**\nTickets fechados: **${s.closed}**\nMensagens analisadas: **${s.totalMessages}**\nPrimeira resposta média: **${avg(m.firstResponseMs)} min**\nResolução média: **${avg(m.resolutionMs)} min**\nEquipes: **${Object.keys(db.teams || {}).length}**\nAutoMod: **${db.automod.enabled ? 'ativo' : 'inativo'}**\nDashboard: **http://localhost:${db.settings.dashboardPort}**`)] });
    }
    if (sub === 'canal') { db.settings[interaction.options.getString('tipo')] = interaction.options.getChannel('canal').id; save(); return interaction.reply({ content: '✅ Canal configurado.', ephemeral: true }); }
    if (sub === 'starboard') { db.settings.starboardChannelId = interaction.options.getChannel('canal').id; db.settings.starboardThreshold = interaction.options.getInteger('minimo'); save(); return interaction.reply({ content: '✅ Starboard configurado.', ephemeral: true }); }
    if (sub === 'reaction-role') { const channel = interaction.options.getChannel('canal'); const messageId = interaction.options.getString('mensagem'); const emoji = interaction.options.getString('emoji'); const role = interaction.options.getRole('cargo'); const message = await channel.messages.fetch(messageId).catch(() => null); if (!message) return interaction.reply({ content: '❌ Mensagem não encontrada nesse canal.', ephemeral: true }); const key = emoji.match(/^<a?:\w+:(\d+)>$/)?.[1] || emoji; db.reactionRoles[messageId] = db.reactionRoles[messageId] || {}; db.reactionRoles[messageId][key] = role.id; save(); await message.react(emoji).catch(() => {}); return interaction.reply({ content: `✅ Reaction role configurado: ${emoji} → ${role}.`, ephemeral: true }); }
    if (sub === 'sugestao') { const channelId = db.settings.suggestionChannelId || interaction.channelId; const channel = await interaction.guild.channels.fetch(channelId).catch(() => null); if (!channel?.isTextBased()) return interaction.reply({ content: '❌ Configure primeiro um canal de sugestões com `/profissional canal`.', ephemeral: true }); const text = interaction.options.getString('texto'); await channel.send({ embeds: [new EmbedBuilder().setColor(0xfee75c).setTitle('💡 Nova sugestão').setDescription(text).setFooter({ text: `Por ${interaction.user.tag}` })], components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('suggestion_up').setLabel('Aprovar').setStyle(ButtonStyle.Success), new ButtonBuilder().setCustomId('suggestion_down').setLabel('Reprovar').setStyle(ButtonStyle.Danger))] }); return interaction.reply({ content: `✅ Sugestão publicada em ${channel}.`, ephemeral: true }); }
    if (sub === 'tickets') { const category = interaction.options.getChannel('categoria'); const role = interaction.options.getRole('equipe'); const hours = interaction.options.getInteger('inatividade_horas'); const sla = interaction.options.getInteger('sla_horas'); if (category) db.settings.ticketCategoryId = category.id; if (role) db.settings.ticketTeamRoleId = role.id; if (hours) db.settings.inactivityHours = hours; if (sla) db.settings.slaHours = sla; save(); return interaction.reply({ content: '✅ Configuração de tickets, inatividade e SLA atualizada.', ephemeral: true }); }
    if (sub === 'automod') { const active = interaction.options.getBoolean('ativo'); const words = interaction.options.getString('palavras_bloqueadas'); const mentions = interaction.options.getInteger('max_mencoes'); const links = interaction.options.getInteger('max_links'); const windowSeconds = interaction.options.getInteger('janela_spam'); const maxMessages = interaction.options.getInteger('max_mensagens'); const invites = interaction.options.getBoolean('bloquear_convites'); if (active !== null) db.automod.enabled = active; if (words !== null) db.automod.blockedWords = words.split(',').map(x => x.trim()).filter(Boolean); if (mentions) db.automod.maxMentions = mentions; if (links) db.automod.maxLinksPerMessage = links; if (windowSeconds) db.automod.spamWindowSeconds = windowSeconds; if (maxMessages) db.automod.spamMaxMessages = maxMessages; if (invites !== null) db.automod.inviteLinks = invites; save(); return interaction.reply({ content: '✅ AutoMod avançado atualizado.', ephemeral: true }); }
    if (sub === 'comando') { const name = interaction.options.getString('nome').toLowerCase().replace(/[^a-z0-9-_]/g, ''); if (!name) return interaction.reply({ content: '❌ Nome inválido.', ephemeral: true }); db.customCommands[name] = interaction.options.getString('resposta'); save(); return interaction.reply({ content: `✅ Comando criado: **!${name}**`, ephemeral: true }); }
    if (sub === 'permissao') { const operation = interaction.options.getString('operacao'); const role = interaction.options.getRole('cargo'); db.permissions[operation] = Array.from(new Set([...(db.permissions[operation] || []), role.id])); save(); return interaction.reply({ content: `✅ Cargo ${role} autorizado para **${operation}**.`, ephemeral: true }); }
    if (sub === 'painel-ticket') { const channel = interaction.options.getChannel('canal'); await channel.send({ embeds: [new EmbedBuilder().setColor(0x5865f2).setTitle('Atendimento Shadow Games').setDescription('Clique no botão abaixo e preencha o formulário para abrir um atendimento.')], components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('ticket_open').setLabel('Abrir atendimento').setEmoji('🎫').setStyle(ButtonStyle.Primary))] }); return interaction.reply({ content: `✅ Painel publicado em ${channel}.`, ephemeral: true }); }
    if (sub === 'equipe') { const key = interaction.options.getString('chave').toLowerCase().replace(/[^a-z0-9-]/g, '-'); const role = interaction.options.getRole('cargo'); const category = interaction.options.getChannel('categoria'); db.teams[key] = { name: interaction.options.getString('nome'), roleId: role.id, categoryId: category?.id || db.settings.ticketCategoryId || '', enabled: true }; db.forms[key] ||= { title: `Atendimento ${db.teams[key].name}`, questions: ['Explique sua necessidade'], team: key }; save(); return interaction.reply({ content: `✅ Equipe **${db.teams[key].name}** configurada com a chave ${key}.`, ephemeral: true }); }
    if (sub === 'formulario') { const key = interaction.options.getString('equipe').toLowerCase(); if (!db.teams[key]) return interaction.reply({ content: '❌ Equipe não encontrada. Crie-a com `/profissional equipe`.', ephemeral: true }); const questions = interaction.options.getString('perguntas').split('|').map(x => x.trim()).filter(Boolean).slice(0, 5); if (!questions.length) return interaction.reply({ content: '❌ Informe pelo menos uma pergunta.', ephemeral: true }); db.forms[key] = { title: interaction.options.getString('titulo'), questions, team: key }; save(); return interaction.reply({ content: `✅ Formulário da equipe **${key}** atualizado com ${questions.length} pergunta(s).`, ephemeral: true }); }
    if (sub === 'painel-equipe') { const key = interaction.options.getString('equipe').toLowerCase(); if (!db.teams[key]) return interaction.reply({ content: '❌ Equipe não encontrada.', ephemeral: true }); const channel = interaction.options.getChannel('canal'); const cfg = db.teams[key]; const form = db.forms[key] || { title: `Atendimento ${cfg.name}` }; await channel.send({ embeds: [new EmbedBuilder().setColor(0x5865f2).setTitle(form.title).setDescription(`Abra um atendimento diretamente com a equipe **${cfg.name}**.`)], components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`advanced_ticket_open:${key}`).setLabel(`Abrir com ${cfg.name}`).setEmoji('🎫').setStyle(ButtonStyle.Primary))] }); return interaction.reply({ content: `✅ Painel da equipe publicado em ${channel}.`, ephemeral: true }); }
    if (sub === 'pagamento') { const result = payments.select(interaction.options.getString('provedor'), interaction.options.getString('modo')); return interaction.reply({ content: `✅ Provedor selecionado: **${result.name}** (${result.mode}).\nConfiguração encontrada: **${result.configured ? 'sim' : 'ainda não'}**.`, ephemeral: true }); }
  }
};
