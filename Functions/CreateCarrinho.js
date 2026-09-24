const { EmbedBuilder, ApplicationCommandType, ActionRowBuilder, ButtonBuilder, ChannelType } = require("discord.js");
const { DentroCarrinho1 } = require("./DentroCarrinho");
const { carrinhos } = require("../DataBaseJson");

function VerificaçõesCarrinho(infos) {
 if (infos.estoque <= 0) return { error: 400, message: `Sem Stock Dísponivel` }
 return { status: 202 }
}

async function CreateCarrinho(interaction, infos) {
 await interaction.reply({ content: `🔄 Aguarde...`, ephemeral: true });
 const thread2222 = interaction.channel.threads.cache.find(x => x.name === `🛒・${interaction.user.username}・${interaction.user.id}`);
 if (thread2222 !== undefined) {
 const row4 = new ActionRowBuilder()
 .addComponents(
 new ButtonBuilder()
 .setURL(`https://discord.com/channels/${interaction.guild.id}/${interaction.channel.id}/${thread2222.id}`)
 .setLabel('Ir para o carrinho')
 .setStyle(5)
 )

 await interaction.editReply({ content: `❌ Você já possuí um carrinho aberto.`, components: [row4] })
 return
 }

 const thread = await interaction.channel.threads.create({
 name: `🛒・${interaction.user.username}・${interaction.user.id}`,
 autoArchiveDuration: 60,
 type: ChannelType.PrivateThread,
 reason: 'Needed a separate thread for moderation',
 members: [interaction.user.id],
 });

 const row4 = new ActionRowBuilder()
 .addComponents(
 new ButtonBuilder()
 .setURL(`https://discord.com/channels/${interaction.guild.id}/${interaction.channel.id}/${thread.id}`)
 .setLabel('Ir para o carrinho')
 .setStyle(5)
 )

 // Respostas efêmeras devem ser alteradas pela Interaction, não por Message#edit.
 // O Message retornado por fetchReply pode não ter canal associado e falha com
 // "Cannot read properties of null (reading 'name')" no discord.js.
 await interaction.editReply({ content: `✅ Carrinho criado!`, components: [row4] })

 // Persistir apenas dados simples evita perder os dados ao serializar User/Guild.
 await carrinhos.set(thread.id, {
 user: {
  id: interaction.user.id,
  username: interaction.user.username,
  avatarURL: interaction.user.displayAvatarURL?.() || null,
 },
 guild: { id: interaction.guild.id, name: interaction.guild.name },
 threadid: thread.id,
 infos: infos,
 })

 await DentroCarrinho1(thread)

}

module.exports = {
 VerificaçõesCarrinho,
 CreateCarrinho
}
