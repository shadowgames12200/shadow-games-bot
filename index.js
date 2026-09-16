const path = require('path');
process.chdir(__dirname);
const { GatewayIntentBits, Client, Collection } = require('discord.js');
const { AtivarIntents } = require('./Functions/StartIntents');
const { install: installProfessionalSuite } = require('./ProfessionalSuite');
const { install: installGovernance } = require('./GovernanceSuite');
const { install: installProduction } = require('./ProductionSuite');
const { install: installSecurity } = require('./SecuritySuite');
const { install: installLogs } = require('./LogSuite');
const { install: installLegacyTicketStaff } = require('./LegacyTicketStaff');
const { ensure: ensurePayments } = require('./PaymentProviders');
const { installProcessHandlers, recordError } = require('./Lib/Resilience');
const { installInteractionGuard, wrapInteractionHandler } = require('./Lib/InteractionGuard');
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
  AtivarIntents();
  const { initialize } = require('./DatabasePostgres');
  await initialize();
  const config = require('./config.json');
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
  const token = process.env.DISCORD_TOKEN || config.token;
  if (!token) throw new Error('Defina DISCORD_TOKEN no ambiente antes de iniciar o bot.');
  await client.login(token);
}
start().catch(error => { recordError(error, { type: 'startup' }); console.error('[Startup]', error); process.exitCode = 1; });
