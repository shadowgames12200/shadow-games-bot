const { ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder } = require('discord.js');

const { tickets } = require('../DataBaseJson');



function buildPanel(guild) {
  
  const appearance = tickets.get('tickets.aparencia') || {};
  
  const menu = new StringSelectMenuBuilder()
  
    .setCustomId('ticket_public_options')
  
    .setPlaceholder('Selecione o tipo de atendimento')
  
    .addOptions(
      
      { value: 'Suporte ao Cliente', label: 'Suporte ao Cliente', description: 'Problemas com compras, pagamentos ou pedidos', emoji: '🛒' },
      
      { value: 'Dúvidas', label: 'Dúvidas', description: 'Perguntas sobre produtos, serviços ou valores', emoji: '❓' }
      
    );
  
  const embed = new EmbedBuilder()
  
    .setTitle(appearance.title || 'Atendimento')
  
    .setDescription(appearance.description || 'Selecione uma opção abaixo para abrir seu atendimento.')
  
    .setFooter({ text: guild.name, iconURL: guild.iconURL({ dynamic: true }) })
  
    .setTimestamp();
  
  if (appearance.color) embed.setColor(appearance.color);
  
  if (appearance.banner) embed.setImage(appearance.banner);
  
  return { embeds: [embed], components: [new ActionRowBuilder().addComponents(menu)] };
  
}

function CreateMessageTicket(interaction, channel, client) {
  
  const channel2 = client.channels.cache.get(channel);
  
  if (!channel2) return;
  
  channel2.send(buildPanel(interaction.guild)).then(msg => tickets.push('tickets.messageid', { msgid: msg.id, channelid: msg.channel.id, guildid: msg.guild.id })).catch(() => {});
  
}

async function Checkarmensagensticket(client) {
  
  const items = tickets.get('tickets.messageid') || [];
  
  for (const item of items) {
    
    try {
      
      const channel = await client.channels.fetch(item.channelid);
      
      const msg = await channel.messages.fetch(item.msgid);
      
      await msg.edit(buildPanel(channel.guild));
      
    } catch (_) {}
    
  }
  
}

module.exports = { CreateMessageTicket, Checkarmensagensticket, buildPanel };































