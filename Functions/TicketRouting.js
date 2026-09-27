const FORM_PREFIX = 'ticket_open_form_';
const KEY_MARKER = 'key_';

function normalize(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function isSupportType(value) {
  const text = normalize(value);
  return /\bsuporte\b/.test(text);
}

function isSupportEntry(entry) {
  if (!entry) return false;
  const [key, item] = entry;
  return isSupportType(item?.nome) || isSupportType(key);
}

function formCustomId(key) {
  const encodedKey = Buffer.from(String(key ?? ''), 'utf8').toString('base64url');
  return `${FORM_PREFIX}${KEY_MARKER}${encodedKey}`;
}

function resolveFormEntry(functions, customId) {
  const entries = Object.entries(functions || {});
  const suffix = String(customId || '').startsWith(FORM_PREFIX)
    ? String(customId).slice(FORM_PREFIX.length)
    : '';

  if (suffix.startsWith(KEY_MARKER)) {
    let key;
    try {
      key = Buffer.from(suffix.slice(KEY_MARKER.length), 'base64url').toString('utf8');
    } catch {
      return null;
    }
    return Object.prototype.hasOwnProperty.call(functions || {}, key)
      ? [key, functions[key]]
      : null;
  }

  // Compatibilidade com formulários antigos que guardavam apenas o tipo,
  // sem a chave da função configurada.
  if (suffix === 'support') return entries.find(isSupportEntry) || null;
  if (suffix === 'doubt') return entries.find(entry => !isSupportEntry(entry)) || null;
  return null;
}

module.exports = { FORM_PREFIX, formCustomId, isSupportType, isSupportEntry, resolveFormEntry };
