'use strict';

const assert = require('node:assert/strict');
const { AtivarIntents } = require('../Functions/StartIntents');

function response({ ok = true, status = 200, contentType = 'application/json', body = {} } = {}) {
  return {
    ok,
    status,
    headers: { get: name => name === 'content-type' ? contentType : null },
    async json() { return body; },
  };
}

(async () => {
  const calls = [];
  const result = await AtivarIntents('fake-token-for-unit-test', async (url, options) => {
    calls.push({ url, options });
    return calls.length === 1
      ? response({ body: { id: 'application-test-id' } })
      : response({ body: { id: 'application-test-id' } });
  });
  assert.deepEqual(result, { applicationId: 'application-test-id', updated: true });
  assert.equal(calls.length, 2);
  assert.match(calls[0].url, /\/users\/@me$/);
  assert.equal(calls[1].options.method, 'PATCH');
  assert.equal(JSON.parse(calls[1].options.body).flags, 8953856);

  await assert.rejects(
    AtivarIntents('fake-token-for-unit-test', async () => response({ ok: false, status: 401 })),
    /HTTP 401/,
  );
  await assert.rejects(
    AtivarIntents('fake-token-for-unit-test', async () => response({ contentType: 'text/html' })),
    /text\/html/,
  );
  await assert.rejects(
    AtivarIntents('fake-token-for-unit-test', async () => response({ body: {} })),
    /ID da aplicação/,
  );
  await assert.rejects(
    AtivarIntents('fake-token-for-unit-test', async (_, options) =>
      options.method === 'PATCH' ? response({ ok: false, status: 403 }) : response({ body: { id: 'application-test-id' } })),
    /PATCH de flags respondeu HTTP 403/,
  );
  await assert.rejects(AtivarIntents('  ', async () => response()), /DISCORD_TOKEN/);

  console.log('start-intents=ok');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
