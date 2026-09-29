'use strict';

const emojiFetches = new Map();

function valuesOf(collection) {
  if (!collection) return [];
  if (typeof collection.values === 'function') return [...collection.values()];
  return Array.isArray(collection) ? collection : [];
}

function findEmoji(collection, expectedName) {
  if (typeof collection?.find === 'function') {
    return collection.find(item => String(item?.name || '').toLowerCase() === expectedName);
  }
  return valuesOf(collection).find(item => String(item?.name || '').toLowerCase() === expectedName);
}

function emojiMarkup(emoji) {
  if (!emoji?.id || !emoji?.name) return null;
  const prefix = emoji.animated ? 'a' : '';
  return `<${prefix}:${emoji.name}:${emoji.id}>`;
}

/**
 * Converts aliases such as :ea1: into Discord's required custom-emoji markup.
 * It first checks the target guild cache and fetches that guild's emoji list
 * by name if the cache is incomplete. Unknown aliases are preserved verbatim.
 */
async function renderAutoEmojiAliases(text, guild, configuredEmojis = []) {
  if (typeof text !== 'string' || !text) return text;
  const aliases = [...new Set([...text.matchAll(/:ea(\d{1,2}):/gi)].map(match => `ea${Number(match[1])}`))];
  if (!aliases.length) return text;

  let collection = guild?.emojis?.cache;
  const configured = valuesOf(configuredEmojis);
  const findAvailable = (name, source = collection) => findEmoji(source, name) || findEmoji(configured, name);
  const needsFetch = aliases.some(name => !findAvailable(name));
  if (needsFetch && guild?.emojis && typeof guild.emojis.fetch === 'function') {
    const guildKey = String(guild.id || 'unknown');
    let fetchPromise = emojiFetches.get(guildKey);
    if (!fetchPromise) {
      fetchPromise = guild.emojis.fetch().catch(error => {
        emojiFetches.delete(guildKey);
        console.warn(`[RenderEmojiAliases] Não foi possível buscar emojis do servidor ${guildKey}: ${error.message}`);
        return null;
      });
      emojiFetches.set(guildKey, fetchPromise);
    }
    const fetched = await fetchPromise;
    collection = fetched || guild.emojis.cache || collection;
  }

  const missingAliases = aliases.filter(name => !findAvailable(name, collection));
  if (missingAliases.length) {
    console.warn(`[RenderEmojiAliases] Aliases não encontrados em ${guild?.id || 'servidor desconhecido'}: ${missingAliases.join(', ')}`);
  }

  return text.replace(/:ea(\d{1,2}):/gi, (alias, number) => {
    const expectedName = `ea${Number(number)}`;
    const markup = emojiMarkup(findAvailable(expectedName, collection));
    return markup || alias;
  });
}

module.exports = { renderAutoEmojiAliases };
