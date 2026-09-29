'use strict';

const MAX_TICKET_FUNCTIONS = 24;

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function getTicketFunctions(database) {
  const functions = database.get('tickets.funcoes');
  return isRecord(functions) ? functions : {};
}

function listTicketFunctions(database) {
  return Object.entries(getTicketFunctions(database)).filter(([, item]) =>
    isRecord(item) && typeof item.nome === 'string' && item.nome.trim().length > 0,
  );
}

function normalizeName(value) {
  return String(value ?? '').trim();
}

function findTicketFunctionKey(functions, name) {
  const normalized = normalizeName(name).toLocaleLowerCase('pt-BR');
  if (!normalized) return undefined;

  return Object.keys(functions).find(key => {
    const item = functions[key];
    const normalizedKey = normalizeName(key).toLocaleLowerCase('pt-BR');
    const normalizedStoredName = normalizeName(isRecord(item) ? item.nome : '').toLocaleLowerCase('pt-BR');
    return normalizedKey === normalized || normalizedStoredName === normalized;
  });
}

function addTicketFunction(database, name, details, maxFunctions = MAX_TICKET_FUNCTIONS) {
  const normalizedName = normalizeName(name);
  if (!normalizedName) return { ok: false, reason: 'invalid_name' };

  const functions = getTicketFunctions(database);
  if (findTicketFunctionKey(functions, normalizedName) !== undefined) {
    return { ok: false, reason: 'duplicate' };
  }
  if (listTicketFunctions(database).length >= maxFunctions) {
    return { ok: false, reason: 'limit_reached' };
  }

  // Replace the document as a whole so names containing dots remain literal keys.
  database.set('tickets.funcoes', {
    ...functions,
    [normalizedName]: { ...details, nome: normalizedName },
  });
  return { ok: true, key: normalizedName };
}

function removeTicketFunction(database, name) {
  const functions = getTicketFunctions(database);
  const key = findTicketFunctionKey(functions, name);
  if (key === undefined) return false;

  const next = { ...functions };
  delete next[key];
  database.set('tickets.funcoes', next);
  return true;
}

function getTicketPanelBlocker(database) {
  if (listTicketFunctions(database).length === 0) return 'functions';

  const appearance = database.get('tickets.aparencia');
  if (!isRecord(appearance) || Object.keys(appearance).length === 0) return 'appearance';
  return null;
}

module.exports = {
  MAX_TICKET_FUNCTIONS,
  addTicketFunction,
  getTicketFunctions,
  getTicketPanelBlocker,
  listTicketFunctions,
  removeTicketFunction,
};
