const fs = require('fs');
const path = require('path');

module.exports = {
  run: (client) => {
    const commands = [];
    const root = path.join(__dirname, '..', 'ComandosSlash');
    for (const folder of fs.readdirSync(root, { withFileTypes: true })) {
      if (!folder.isDirectory()) continue;
      const folderPath = path.join(root, folder.name);
      for (const file of fs.readdirSync(folderPath)) {
        if (!file.endsWith('.js')) continue;
        const command = require(path.join(folderPath, file));
        if (!command?.name || typeof command.run !== 'function') continue;
        client.slashCommands.set(command.name, command);
        commands.push(command.data || command);
      }
    }
    client.once('ready', async () => {
      try {
        await client.application.commands.set(commands);
        console.log(`[Slash] ${commands.length} comandos registrados.`);
      } catch (error) {
        console.error('[Slash] Falha ao registrar comandos:', error);
      }
    });
  }
};
