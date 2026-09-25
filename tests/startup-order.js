'use strict';

const assert = require('node:assert/strict');
const EventEmitter = require('node:events');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'index.js'), 'utf8');

async function runWithToken(token) {
  const order = [];
  const errors = [];
  let client;

  class MockClient extends EventEmitter {
    constructor(options) {
      super();
      this.options = options;
      client = this;
    }

    async login(receivedToken) {
      order.push('login');
      assert.equal(receivedToken, token.trim());
      this.user = { tag: 'mock#0001' };
      this.emit('ready'); // Simulate a Gateway that becomes ready immediately.
      return 'ready';
    }
  }

  class MockCollection extends Map {}
  const install = name => ({ install: instance => {
    assert.equal(instance, client);
    order.push(name);
    instance.on('interactionCreate', () => {});
  } });

  const modules = {
    'discord.js': {
      GatewayIntentBits: {
        Guilds: 1,
        GuildMessages: 2,
        MessageContent: 3,
        GuildMembers: 4,
        GuildVoiceStates: 5,
        GuildMessageReactions: 6,
        DirectMessages: 7,
      },
      Client: MockClient,
      Collection: MockCollection,
    },
    './ProfessionalSuite': install('professional'),
    './GovernanceSuite': install('governance'),
    './ProductionSuite': install('production'),
    './SecuritySuite': install('security'),
    './LogSuite': install('logs'),
    './LegacyTicketStaff': install('legacy-ticket'),
    './PaymentProviders': { ensure: () => order.push('payments') },
    './Lib/Resilience': {
      installProcessHandlers: () => order.push('process-handlers'),
      recordError: error => errors.push(error),
    },
    './InteractionGuard': {
      installInteractionGuard: () => order.push('interaction-guard'),
      wrapInteractionHandler: handler => handler,
    },
    './Functions/VariaveisEstatisticas': class MockStats {},
    './DatabasePostgres': { initialize: async () => { order.push('database'); } },
    './Handler/events': { run: instance => {
      order.push('events-loader');
      instance.on('ready', () => order.push('events-ready'));
    } },
    './Handler/slash': { run: instance => {
      order.push('slash-loader');
      instance.once('ready', () => order.push('slash-ready'));
    } },
  };

  const processMock = {
    env: token === undefined ? {} : { DISCORD_TOKEN: token },
    chdir: () => order.push('chdir'),
    on: () => {},
    uptime: () => 1,
    exitCode: null,
  };
  const consoleMock = { log: () => {}, warn: () => {}, error: () => {} };
  const moduleMock = { exports: {} };
  const context = {
    require(request) {
      if (!(request in modules)) throw new Error(`Unexpected require: ${request}`);
      return modules[request];
    },
    process: processMock,
    __dirname: '/tmp/test-shadow-games',
    console: consoleMock,
    module: moduleMock,
    exports: moduleMock.exports,
  };

  vm.runInNewContext(source, context, { filename: 'index.js' });
  await new Promise(resolve => setImmediate(resolve));
  return { order, errors, client, processMock, exports: moduleMock.exports };
}

(async () => {
  const ok = await runWithToken('  test-token  ');
  const loginIndex = ok.order.indexOf('login');
  assert.notEqual(loginIndex, -1, 'login must be called');
  for (const required of [
    'database', 'slash-loader', 'events-loader', 'interaction-guard',
    'process-handlers', 'professional', 'governance', 'production',
    'security', 'logs', 'legacy-ticket', 'payments',
  ]) {
    assert.ok(ok.order.indexOf(required) !== -1, `${required} must run`);
    assert.ok(ok.order.indexOf(required) < loginIndex, `${required} must run before login`);
  }
  assert.ok(ok.order.indexOf('slash-ready') > loginIndex, 'slash ready callback must follow login');
  assert.ok(ok.order.indexOf('events-ready') > loginIndex, 'event ready callback must follow login');
  assert.equal(ok.client.options.intents.includes(6), true, 'keep the added reaction intent');
  assert.equal(ok.exports.EstatisticasNode instanceof Object, true);
  assert.deepEqual(ok.errors, []);

  const missing = await runWithToken('   ');
  assert.equal(missing.order.includes('login'), false, 'missing token must not attempt login');
  assert.equal(missing.order.includes('database'), false, 'missing token must fail before opening the database');
  assert.equal(missing.errors.length, 1, 'missing token must reach startup error handling');
  assert.match(missing.errors[0].message, /DISCORD_TOKEN/);
  assert.equal(missing.processMock.exitCode, 1);

  console.log('startup-order=ok');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
