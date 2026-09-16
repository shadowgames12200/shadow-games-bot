const { InteractionType } = require('discord.js');

function isAckable(interaction) {
  return Boolean(interaction && !interaction.isAutocomplete?.());
}

function installInteractionGuard(client, { timeoutMs = 2500 } = {}) {
  const guard = interaction => {
    if (!isAckable(interaction)) return;
    const timer = setTimeout(() => {
      if (interaction.replied || interaction.deferred) return;
      interaction.reply({
        content: '⏳ O bot está processando essa ação. Tente novamente em alguns segundos.',
        ephemeral: true,
      }).catch(() => {});
    }, timeoutMs);
    const clear = () => clearTimeout(timer);
    interaction.client.once(`interactionAck:${interaction.id}`, clear);
    setTimeout(clear, timeoutMs + 1500);
  };
  guard.__interactionGuard = true;
  client.on('interactionCreate', guard);
}

function emitInteractionAck(interaction) {
  try { interaction.client.emit(`interactionAck:${interaction.id}`); } catch (_) {}
}

function wrapInteractionHandler(handler) {
  return async (...args) => {
    const interaction = args[0];
    try {
      const result = await handler(...args);
      if (interaction?.replied || interaction?.deferred) emitInteractionAck(interaction);
      return result;
    } catch (error) {
      emitInteractionAck(interaction);
      console.error('[InteractionGuard] Handler falhou:', error);
      if (interaction && !interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: '❌ Ocorreu um erro ao processar essa ação.', ephemeral: true }).catch(() => {});
      }
    }
  };
}

module.exports = { installInteractionGuard, wrapInteractionHandler, emitInteractionAck };
