const fs = require('fs');
const path = require('path');

const inFlight = new Map();
const metrics = {
  startedAt: Date.now(),
  interactions: 0,
  interactionErrors: 0,
  timeouts: 0,
  duplicateActions: 0,
  lastErrorAt: null,
  lastError: null,
};

function timeout(ms, label = 'operação') {
  const delay = Number(ms) > 0 ? Number(ms) : 15000;
  let timer;
  return {
    race(promise) {
      return Promise.race([
        Promise.resolve(promise),
        new Promise((_, reject) => {
          timer = setTimeout(() => {
            metrics.timeouts++;
            const error = new Error(`${label} excedeu o limite de ${delay}ms`);
            error.code = 'OPERATION_TIMEOUT';
            reject(error);
          }, delay);
        }),
      ]).finally(() => clearTimeout(timer));
    },
  };
}

async function withTimeout(promise, ms, label) {
  return timeout(ms, label).race(promise);
}

function once(key, ttlMs = 15000) {
  const now = Date.now();
  const existing = inFlight.get(key);
  if (existing && existing.expiresAt > now) {
    metrics.duplicateActions++;
    return false;
  }
  inFlight.set(key, { expiresAt: now + ttlMs });
  setTimeout(() => {
    const current = inFlight.get(key);
    if (current?.expiresAt <= Date.now()) inFlight.delete(key);
  }, ttlMs + 50).unref?.();
  return true;
}

function release(key) { inFlight.delete(key); }

function recordError(error, context = {}) {
  metrics.lastErrorAt = new Date().toISOString();
  metrics.lastError = { message: error?.message || String(error), code: error?.code || null, context };
  console.error('[Resilience]', metrics.lastError, error?.stack || '');
}

function installProcessHandlers(client) {
  process.on('unhandledRejection', reason => recordError(reason, { type: 'unhandledRejection' }));
  process.on('uncaughtException', error => recordError(error, { type: 'uncaughtException' }));
  client?.on('error', error => recordError(error, { type: 'discordClientError' }));
  client?.on('warn', warning => console.warn('[Discord warn]', warning));
}

function snapshot() {
  return { ...metrics, uptimeSeconds: Math.floor(process.uptime()), memory: process.memoryUsage() };
}

function backupJson(sourceFile, backupDir, keep = 7) {
  if (!fs.existsSync(sourceFile)) return null;
  fs.mkdirSync(backupDir, { recursive: true });
  const base = path.basename(sourceFile, path.extname(sourceFile));
  const target = path.join(backupDir, `${base}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  fs.copyFileSync(sourceFile, target);
  const files = fs.readdirSync(backupDir).filter(file => file.startsWith(`${base}-`) && file.endsWith('.json')).sort().reverse();
  for (const old of files.slice(keep)) fs.rmSync(path.join(backupDir, old), { force: true });
  return target;
}

module.exports = { metrics, timeout, withTimeout, once, release, recordError, installProcessHandlers, snapshot, backupJson };
