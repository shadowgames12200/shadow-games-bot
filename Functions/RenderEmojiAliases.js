'use strict';

/**
 * Converts the product-description shorthand :ea1: into Discord's required
 * custom-emoji markup, using the target guild's emoji cache. Unknown names are
 * left unchanged so text is never silently lost.
 */
function renderAutoEmojiAliases(text, guild) {
  if (typeof text !== 'string' || !text) return text;
  const emojis = guild?.emojis?.cache;
  if (!emojis) return text;

  return text.replace(/:ea(\d{1,2}):/gi, (alias, number) => {
    const expectedName = `ea${Number(number)}`.toLowerCase();
    const emoji = typeof emojis.find === 'function'
      ? emojis.find(item => String(item?.name || '').toLowerCase() === expectedName)
      : [...emojis.values?.() || []].find(item => String(item?.name || '').toLowerCase() === expectedName);

    return emoji && typeof emoji.toString === 'function' && emoji.id
      ? emoji.toString()
      : alias;
  });
}

module.exports = { renderAutoEmojiAliases };
