const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const DATA_DIR = path.join(__dirname, 'DataBaseJson');
const namespaces = new Map();
let pool = null;
let ready = false;
let initializing = null;
const pendingSync = new Set();
let retryTimer = null;

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8') || '{}'); }
  catch { return {}; }
}

function writeJsonAtomic(file, data) {
  const temporary = `${file}.tmp-${process.pid}`;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(temporary, JSON.stringify(data, null, 2));
  fs.renameSync(temporary, file);
}

function scheduleRetry() {
  if (retryTimer || !pendingSync.size) return;
  retryTimer = setTimeout(async () => {
    retryTimer = null;
    for (const name of [...pendingSync]) {
      try {
        await persistPostgres(name);
        pendingSync.delete(name);
      } catch (error) {
        console.error(`[DatabasePostgres] Ainda não foi possível sincronizar ${name}:`, error.message);
      }
    }
    if (pendingSync.size) scheduleRetry();
  }, 30000);
  retryTimer.unref?.();
}


const names = ['produtos', 'carrinhos', 'pagamentos', 'pedidos', 'configuracao', 'estatisticas', 'avaliacoes', 'tickets', 'permissions', 'refounds', 'professional'];
function loadLocal() {
  for (const name of names) {
    if (!namespaces.has(name) || !Object.keys(namespaces.get(name) || {}).length) {
      namespaces.set(name, readJson(path.join(DATA_DIR, `${name}.json`)));
    }
  }
}

async function initialize() {
  if (ready) return;
  if (initializing) return initializing;
  initializing = (async () => {
    if (!process.env.DATABASE_URL) {
      loadLocal();
      ready = true;
      return;
    }
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 4,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false },
    });
    await pool.query(`
      create table if not exists bot_documents (
        namespace text primary key,
        data jsonb not null,
        updated_at timestamptz not null default now()
      )
    `);
    for (const name of names) {
      const result = await pool.query('select data from bot_documents where namespace = $1', [name]);
      if (result.rowCount) namespaces.set(name, clone(result.rows[0].data));
      else {
        const file = path.join(DATA_DIR, `${name}.json`);
        const data = readJson(file);
        namespaces.set(name, data);
        await pool.query('insert into bot_documents(namespace, data) values($1, $2::jsonb) on conflict(namespace) do nothing', [name, JSON.stringify(data)]);
      }
    }
    ready = true;
  })().catch(error => {
    console.error('[DatabasePostgres] PostgreSQL indisponível; usando JSON local:', error.message);
    pool = null;
    loadLocal();
    ready = true;
  });
  return initializing;
}

function pathParts(key) { return String(key).split('.').filter(Boolean); }
function getPath(root, key) {
  let current = root;
  for (const part of pathParts(key)) { if (current == null) return undefined; current = current[part]; }
  return clone(current);
}
function setPath(root, key, value) {
  const parts = pathParts(key);
  if (!parts.length) return value;
  let current = root;
  for (const part of parts.slice(0, -1)) {
    if (!current[part] || typeof current[part] !== 'object') current[part] = {};
    current = current[part];
  }
  current[parts.at(-1)] = clone(value);
  return root;
}
function deletePath(root, key) {
  const parts = pathParts(key);
  if (!parts.length) return {};
  let current = root;
  for (const part of parts.slice(0, -1)) { if (!current || typeof current !== 'object') return root; current = current[part]; }
  if (current && typeof current === 'object') delete current[parts.at(-1)];
  return root;
}
async function persistPostgres(name) {
  if (!pool) throw new Error('PostgreSQL indisponível');
  const data = namespaces.get(name) || {};
  await pool.query('insert into bot_documents(namespace, data, updated_at) values($1, $2::jsonb, now()) on conflict(namespace) do update set data = excluded.data, updated_at = now()', [name, JSON.stringify(data)]);
}

function persist(name) {
  const data = namespaces.get(name) || {};
  const file = path.join(DATA_DIR, `${name}.json`);
  try {
    writeJsonAtomic(file, data);
  } catch (error) {
    console.error(`[DatabasePostgres] Falha ao salvar cópia local de ${name}:`, error.message);
  }
  if (pool) {
    persistPostgres(name).catch(error => {
      pendingSync.add(name);
      console.error(`[DatabasePostgres] Falha ao sincronizar ${name} no PostgreSQL; cópia local preservada:`, error.message);
      scheduleRetry();
    });
  }
  return data;
}
function createDatabase(name) {
  if (!namespaces.has(name)) namespaces.set(name, {});
  return {
    get(key) { return getPath(namespaces.get(name), key); },
    set(key, value) { setPath(namespaces.get(name), key, value); persist(name); return value; },
    delete(key) { deletePath(namespaces.get(name), key); persist(name); },
    has(key) { return getPath(namespaces.get(name), key) !== undefined; },
    fetchAll() { return Object.entries(clone(namespaces.get(name))); },
    all() { return clone(namespaces.get(name)); },
  };
}
function mirrorDocument(name, data) { namespaces.set(name, clone(data)); persist(name); }
function usingPostgres() { return Boolean(pool && process.env.DATABASE_URL); }

module.exports = { initialize, createDatabase, mirrorDocument, usingPostgres };
