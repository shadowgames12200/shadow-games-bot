'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { renderAutoEmojiAliases } = require('../Functions/RenderEmojiAliases');

function emoji(name, id, animated = false) {
  return { name, id, animated, toString: () => `<${animated ? 'a' : ''}:${name}:${id}>` };
}

async function main() {
  const cachedGuild = {
    id: 'guild-cached',
    emojis: {
      cache: new Map([
        ['1', emoji('ea1', '1183841001824067676')],
        ['2', emoji('ea2', '1194131420499677317')],
        ['3', emoji('ea3', '1194131474534899753', true)]
      ]),
      fetch: async function fetch() { return this.cache; }
    }
  };

  assert.equal(
    await renderAutoEmojiAliases(':ea1::ea2::ea3:', cachedGuild),
    '<:ea1:1183841001824067676><:ea2:1194131420499677317><a:ea3:1194131474534899753>',
    'aliases adjacentes devem virar o formato de emoji customizado exigido pelo Discord'
  );
  assert.equal(
    await renderAutoEmojiAliases('Texto :ea1: e alias ausente :ea4:', cachedGuild),
    'Texto <:ea1:1183841001824067676> e alias ausente :ea4:',
    'aliases conhecidos são convertidos e aliases sem correspondência são preservados'
  );

  let fetchCount = 0;
  const remoteEmojis = new Map([['1', emoji('ea1', '1183841001824067676')]]);
  const guildWithEmptyCache = {
    id: 'guild-fetch',
    emojis: {
      cache: new Map(),
      async fetch() { fetchCount++; this.cache = remoteEmojis; return remoteEmojis; }
    }
  };
  assert.equal(
    await renderAutoEmojiAliases('Emojis: :ea1::ea2:', guildWithEmptyCache),
    'Emojis: <:ea1:1183841001824067676>:ea2:',
    'com cache vazia, o helper deve buscar pelo nome e preservar apenas o nome que não existe'
  );
  assert.equal(fetchCount, 1, 'a consulta à lista de emojis deve ocorrer uma vez por servidor');

  const configuredEmojis = [
    { name: 'ea1', id: '1183841001824067676' },
    { name: 'ea2', id: '1194131420499677317', animated: true }
  ];
  assert.equal(
    await renderAutoEmojiAliases(':ea1::ea2:', { id: 'guild-configured', emojis: { cache: new Map() } }, configuredEmojis),
    '<:ea1:1183841001824067676><a:ea2:1194131420499677317>',
    'deve resolver nomes pelo registro persistido mesmo sem cache/API da guild'
  );

  const archivedRegistry = [
    { name: 'ea5', id: '1515606140652748932', animated: null },
    { name: 'ea3', id: '1515606141453864972', animated: null },
    { name: 'ea7', id: '1515606142921871393', animated: null },
    { name: 'ea1', id: '1515606145660616744', animated: null },
    { name: 'ea4', id: '1515606147137142834', animated: null },
    { name: 'ea2', id: '1515606147921350740', animated: null },
    { name: 'ea8', id: '1515606160886206615', animated: null },
    { name: 'ea6', id: '1515606162643484702', animated: null }
  ];
  assert.equal(
    await renderAutoEmojiAliases(':ea1::ea2::ea3::ea4::ea5::ea6::ea7::ea8:', null, archivedRegistry),
    '<:ea1:1515606145660616744><:ea2:1515606147921350740><:ea3:1515606141453864972><:ea4:1515606147137142834><:ea5:1515606140652748932><:ea6:1515606162643484702><:ea7:1515606142921871393><:ea8:1515606160886206615>',
    'deve converter os oito aliases com a estrutura exata do registro salvo no ZIP antigo'
  );

  const sender = fs.readFileSync(path.join(__dirname, '../Functions/SenderMessagesOrUpdates.js'), 'utf8');
  assert.match(sender, /renderAutoEmojiAliases\(text, guild, configuredEmojis\)/,
    'a publicação e sincronização devem usar a lista de emojis criada pelo comando');
  assert.match(sender, /\[ProductEmojiAliases\] aliases=\$\{aliasCount\} registry=\$\{registryCount\}/,
    'o diagnóstico deve registrar só contagens, nunca o texto da descrição');
  assert.match(sender, /renderAutoEmojiAliases\(yyy\.Campos\[0\]\.desc\.slice\(0, 1024\), interaction\.guild, configuracao\.get\('Emojis_EntregAuto'\)\)/,
    'o post inicial deve renderizar aliases também na descrição do campo');
  assert.match(sender, /renderAutoEmojiAliases\(ghgh\.Campos\[0\]\.desc\.slice\(0, 1024\), null, configuracao\.get\('Emojis_EntregAuto'\)\)/,
    'a sincronização deve renderizar aliases nos campos usando o registro salvo');

  assert.equal(await renderAutoEmojiAliases('Texto normal', cachedGuild), 'Texto normal');
  assert.equal(await renderAutoEmojiAliases(':ea1:', null), ':ea1:');
  assert.equal(await renderAutoEmojiAliases(null, cachedGuild), null);

  console.log('emoji-aliases=ok');
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
