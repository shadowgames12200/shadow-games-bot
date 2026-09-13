const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const { tickets } = require('../DataBaseJson');

function buildPanel(guild) {
  const functions = tickets.get('tickets.funcoes') || {};
  const appearance = tickets.get('tickets.aparencia') || {};
  const buttons = Object.entries(functions).slice(0, 5).map(([key, item]) => {
    const button = new ButtonBuilder().setCustomId(`AbrirTicket_${key}`).setLabel(String(item.nome || key).slice(0, 80)).setStyle(ButtonStyle.Primary);
    if (item.emoji) button.setEmoji(item.emoji);
    return button;
  });
  const embed = new EmbedBuilder().setTitle(appearance.title || 'Atendimento').setDescription(appearance.description || 'Selecione uma opção para abrir seu atendimento.')
    .setFooter({ text: guild.name, iconURL: guild.iconURL({ dynamic: true }) }).setTimestamp();
  if (appearance.color) embed.setColor(appearance.color);
  if (appearance.banner) embed.setImage(appearance.banner);
  return { embeds: [embed], components: buttons.length ? [new ActionRowBuilder().addComponents(buttons)] : [] };
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
module.exports = { CreateMessageTicket, Checkarmensagensticket };
