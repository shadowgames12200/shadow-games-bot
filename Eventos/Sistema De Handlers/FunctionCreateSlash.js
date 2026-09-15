const Discord = require("discord.js")



module.exports = {
    
    name: 'interactionCreate',
    

    
    run: async (interaction, client) => {
        
        if (!interaction.isChatInputCommand() && !interaction.isMessageContextMenuCommand() && !interaction.isUserContextMenuCommand()) return;
        
        const command = client.slashCommands.get(interaction.commandName);
        
        if (!command) return interaction.reply({ content: 'O comando não está disponível neste momento.', ephemeral: true });
        
        interaction.member = interaction.member || interaction.guild?.members.cache.get(interaction.user.id);
        
        try {
            
            await command.run(client, interaction);
            
        } catch (error) {
            
            console.error(`[Slash] Falha no comando ${interaction.commandName}:`, error);
            
            const payload = { content: '❌ Ocorreu um erro ao processar este comando.', ephemeral: true };
            
            if (interaction.deferred || interaction.replied) await interaction.editReply(payload).catch(() => {});
            
            else await interaction.reply(payload).catch(() => {});
            
        }
        
    }
        
}


















