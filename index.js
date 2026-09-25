const path = require('path');
process.chdir(__dirname);
const { GatewayIntentBits, Client, Collection } = require('discord.js');
const { install: installProfessionalSuite } = require('./ProfessionalSuite');
const { install: installGovernance } = require('./GovernanceSuite');
const { install: installProduction } = require('./ProductionSuite');
const { install: installSecurity } = require('./SecuritySuite');
const { install: installLogs } = require('./LogSuite');
const { install: installLegacyTicketStaff } = require('./LegacyTicketStaff');
const { ensure: ensurePayments } = require('./PaymentProviders');
const { installProcessHandlers, recordError } = require('./Lib/Resilience');
const { installInteractionGuard, wrapInteractionHandler } = require('./InteractionGuard');
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildVoiceStates, GatewayIntentBits.GuildMessageReactions, GatewayIntentBits.DirectMessages] });
const originalClientOn = client.on.bind(client);
client.on = (event, listener) => originalClientOn(
  event,
  event === 'interactionCreate' && !listener.__interactionGuard ? wrapInteractionHandler(listener) : listener,
);
const estatisticasNodeInstance = require('./Functions/VariaveisEstatisticas');
const EstatisticasNode = new estatisticasNodeInstance();
module.exports = { EstatisticasNode };
async function start() {
  const { initialize } = require('./DatabasePostgres');
  await initialize();
  const events = require('./Handler/events');
  const slash = require('./Handler/slash');
  client.slashCommands = new Collection();
  slash.run(client);
  events.run(client);
  installInteractionGuard(client);
  installProcessHandlers(client);
  installProfessionalSuite(client);
  installGovernance(client);
  installProduction(client);
  installSecurity(client);
  installLogs(client);
  installLegacyTicketStaff(client);
  ensurePayments();
  const token = typeof process.env.DISCORD_TOKEN === 'string' ? process.env.DISCORD_TOKEN.trim() : '';
  if (!token) throw new Error('Defina DISCORD_TOKEN no Render antes de iniciar o bot.');
  const applicationId = Buffer.from(token.split('.')[0] || '', 'base64').toString('utf8');
  console.log(`[Discord] Iniciando Gateway com DISCORD_TOKEN${/^\d+$/.test(applicationId) ? ` da aplicação ${applicationId}` : ''}`);
  const gatewaySignals = [
    ['hello', /\bhello\b/i], ['identify', /\bidentify\b/i], ['heartbeat', /\bheartbeat\b/i],
    ['ready', /\bready\b/i], ['resumed', /\bresumed\b/i], ['close', /close|disconnect/i],
    ['error', /error|invalid session|rate.?limit/i],
  ];
  client.on('debug', message => {
    const signal = gatewaySignals.find(([, pattern]) => pattern.test(message));
    if (signal) console.log(`[Discord Gateway debug] ${signal[0]}`);
  });
  client.on('shardCreate', shard => console.log(`[Discord] Shard criado: ${shard.id}`));
  setTimeout(() => {
    if (client.isReady()) return;
    const shards = [...(client.ws?.shards?.values?.() ?? [])].map(shard => ({ id: shard.id, status: shard.status, ping: shard.ping }));
    console.error('[Discord] Gateway ainda sem ready após 60s', { wsStatus: client.ws?.status ?? null, shards });
  }, 60000).unref();
  client.on('shardReady', shardId => console.log(`[Discord] Gateway pronto; shard ${shardId}`));
  client.once('ready', () => console.log(`[Discord] Bot autenticado como ${client.user.tag} (${client.user.id})`));
  client.on('shardReconnecting', shardId => console.warn(`[Discord] Reconectando shard ${shardId}`));
  client.on('shardDisconnect', (event, shardId) => {
    console.error('[Discord] Gateway desconectou', {
      shardId,
      code: event?.code ?? null,
      reason: event?.reason?.toString?.() || '',
    });
  });
  client.on('shardError', (error, shardId) => recordError(error, { type: 'discordShardError', shardId }));
  await client.login(token);
}
start().catch(error => { recordError(error, { type: 'startup' }); console.error('[Startup]', error); process.exitCode = 1; });
