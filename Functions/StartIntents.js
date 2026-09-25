'use strict';

const DISCORD_API = 'https://discord.com/api/v10';

/**
 * Update application feature flags using the deployment token.
 * This REST PATCH does not enable privileged Gateway intents; those remain a
 * Discord Developer Portal setting. The helper is deliberately not auto-run
 * during bot startup.
 */
async function AtivarIntents(token = process.env.DISCORD_TOKEN, fetchImpl = globalThis.fetch) {
  const botToken = String(token || '').trim();
  if (!botToken) throw new Error('DISCORD_TOKEN não configurado.');
  if (typeof fetchImpl !== 'function') throw new Error('A função fetch não está disponível.');

  const headers = {
    Authorization: `Bot ${botToken}`,
    'Content-Type': 'application/json',
  };
  const me = await fetchImpl(`${DISCORD_API}/users/@me`, { headers });
  if (!me.ok) throw new Error(`Discord /users/@me respondeu HTTP ${me.status}`);
  const contentType = me.headers?.get?.('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error(`Discord respondeu ${contentType || 'conteúdo não JSON'}`);
  }

  const application = await me.json();
  if (!application?.id) throw new Error('Discord não retornou o ID da aplicação.');

  const updated = await fetchImpl(`${DISCORD_API}/applications/${encodeURIComponent(application.id)}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ flags: 8953856 }),
  });
  if (!updated.ok) throw new Error(`Discord PATCH de flags respondeu HTTP ${updated.status}`);

  return { applicationId: application.id, updated: true };
}

module.exports = { AtivarIntents };
