function isAckable(interaction) {
  
  return Boolean(interaction && !interaction.isAutocomplete?.());
  
}



function installFastCompatibility(interaction, mode) {
  
  if (interaction.__fastCompatibilityInstalled) return;
  
  interaction.__fastCompatibilityInstalled = true;
  
  if (mode === 'reply') {
    
    const reply = interaction.reply.bind(interaction);
    
    interaction.reply = options => interaction.deferred ? interaction.editReply(options) : reply(options);
    
  }
  
  if (mode === 'update') {
    
    const update = interaction.update.bind(interaction);
    
    interaction.update = options => interaction.deferred ? interaction.editReply(options) : update(options);
    
  }
  
}



function fastAck(interaction) {
  
  const customId = interaction.customId;
  
  if (customId === 'rendimento') {
    
    installFastCompatibility(interaction, 'reply');
    
    return interaction.deferReply({ ephemeral: true }).catch(() => {});
    
  }
  
  if (['todayyyy', '7daysss', '30dayss', 'totalrendimento'].includes(customId)) {
    
    installFastCompatibility(interaction, 'update');
    
    return interaction.deferUpdate().catch(() => {});
    
  }
  
  return null;
  
}



function installInteractionGuard(client, { timeoutMs = 2500 } = {}) {
  
  const guard = interaction => {
    
    if (!isAckable(interaction)) return;
    
    const fast = fastAck(interaction);
    
    if (fast) return;
    
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




























































