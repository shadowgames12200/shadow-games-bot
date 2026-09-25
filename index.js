// Legacy loaders use relative paths; anchor them to this repository, not Render's cwd.
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

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.DirectMessages,
    // Required by the newer reaction-role/starboard feature.
    GatewayIntentBits.GuildMessageReactions,
  ],
});

const originalOn = client.on.bind(client);
client.on = (event, listener) => originalOn(
  event,
  event === 'interactionCreate' && !listener.__interactionGuard
    ? wrapInteractionHandler(listener)
    : listener,
);

const EstatisticasNode = new (require('./Functions/VariaveisEstatisticas'))();
module.exports = { EstatisticasNode };

async function start() {
  // Keep secrets in Render's environment; never fall back to the ZIP's config.json.
  const token = (process.env.DISCORD_TOKEN || '').trim();
  if (!token) throw new Error('Defina DISCORD_TOKEN no Render antes de iniciar o bot.');

  installProcessHandlers(client);
  client.on('debug', message => {
    if (/hello|identify|ready|close|error|invalid session/i.test(message)) {
      console.log('[Discord] ' + message.split('\n')[0]);
    }
  });
  client.once('ready', () => console.log('[Discord] Bot autenticado como ' + client.user.tag));
  client.on('shardError', (error, shardId) => recordError(error, { type: 'discordShardError', shardId }));
  client.on('shardDisconnect', (event, shardId) => {
    console.warn(`[Discord] Shard ${shardId} desconectado (code=${event?.code ?? 'unknown'}).`);
  });

  // Initialize the ZIP-compatible JSON adapter/optional PostgreSQL mirror first.
  const { initialize } = require('./DatabasePostgres');
  await initialize();

  const events = require('./Handler/events');
  const slash = require('./Handler/slash');
  client.slashCommands = new Collection();

  // Load command/event and feature listeners before login can emit `ready`.
  slash.run(client);
  events.run(client);
  installInteractionGuard(client);
  installProfessionalSuite(client);
  installGovernance(client);
  installProduction(client);
  installSecurity(client);
  installLogs(client);
  installLegacyTicketStaff(client);
  ensurePayments();

  await client.login(token);
}

start().catch(error => {
  recordError(error, { type: 'startup' });
  console.error('[Startup]', error);
  process.exitCode = 1;
});
