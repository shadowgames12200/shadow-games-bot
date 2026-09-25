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



const client = new Client({
  
  intents: [
    
    GatewayIntentBits.Guilds,
    
    GatewayIntentBits.GuildMessages,
    
    GatewayIntentBits.MessageContent,
    
    GatewayIntentBits.GuildMembers,
    
    GatewayIntentBits.GuildVoiceStates,
    
    GatewayIntentBits.GuildMessageReactions,
    
    GatewayIntentBits.DirectMessages,
    
  ],
  
});

client.setMaxListeners(0);



const originalClientOn = client.on.bind(client);

client.on = (event, listener) => originalClientOn(
  
  event,
  
  event === 'interactionCreate' && !listener.__interactionGuard ? wrapInteractionHandler(listener) : listener,
  
);



const estatisticasNodeInstance = require('./Functions/VariaveisEstatisticas');

const EstatisticasNode = new estatisticasNodeInstance();

module.exports = { EstatisticasNode };



function installKeepAlive() {
  
  const externalUrl = process.env.RENDER_EXTERNAL_URL;
  
  if (!externalUrl) return;
  
  const ping = async () => {
    
    try {
      
      const response = await fetch(externalUrl, { signal: AbortSignal.timeout(10000) });
      
      console.log(`[Render] Keep-alive HTTP ${response.status}`);
      
    } catch (error) {
      
      console.warn('[Render] Keep-alive falhou:', error.message);
      
    }
    
  };
  
  setInterval(ping, 10 * 60 * 1000).unref();
  
  console.log(`[Render] Keep-alive configurado para ${externalUrl}`);
  
}



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
  
  installKeepAlive();
  

  
  const token = typeof process.env.DISCORD_TOKEN === 'string' ? process.env.DISCORD_TOKEN.trim() : '';
  
  if (!token) throw new Error('Defina DISCORD_TOKEN no Render antes de iniciar o bot.');
  
  const applicationId = Buffer.from(token.split('.')[0] || '', 'base64').toString('utf8');
  
  console.log(`[Discord] Iniciando Gateway com DISCORD_TOKEN${/^\d+$/.test(applicationId) ? ` da aplicação ${applicationId}` : ''















































