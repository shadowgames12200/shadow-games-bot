
const Discord = require("discord.js")
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require("discord.js")
const { Painel, Gerenciar2 } = require("../../Functions/Painel");
const { Gerenciar } = require("../../Functions/Gerenciar");
const { ConfigRoles } = require("../../Functions/ConfigRoles");
const { msgbemvindo } = require("../../Functions/MensagemBemVindo");
const { EstatisticasNode } = require("../../index.js");
const { profileuser } = require("../../Functions/profile");
const { produtos, configuracao, tickets, estatisticas } = require("../../DataBaseJson");
const { Posicao1 } = require("../../Functions/PosicoesFunction.js");
const { painelTicket } = require("../../Functions/PainelTickets.js");
const { CreateMessageTicket, Checkarmensagensticket } = require("../../Functions/CreateMensagemTicket.js");
const { CreateTicket } = require("../../Functions/CreateTicket.js");
const { GerenciarCampos2 } = require("../../Functions/GerenciarCampos.js");
const { MessageStock } = require("../../Functions/ConfigEstoque.js");

module.exports = {
    name: 'interactionCreate',

    run: async (interaction, client) => {

        if (interaction.type == Discord.InteractionType.ModalSubmit) {

            if (interaction.customId == 'sdaju11111231idsj1233js123dua123') {
                let NOME = interaction.fields.getTextInputValue('tokenMP');
                let PREDESC = interaction.fields.getTextInputValue('tokenMP2');
                let DESC = interaction.fields.getTextInputValue('tokenMP3');
                let BANNER = interaction.fields.getTextInputValue('tokenMP5');
                let EMOJI = interaction.fields.getTextInputValue('tokenMP6');

                NOME = NOME.replace('.', '');
                PREDESC = PREDESC.replace('.', '');

                if (tickets.get(`tickets.funcoes.${NOME}`) !== null) {
                    return interaction.reply({ content: `❌ | Já existe uma função com esse nome!`, ephemeral: true });
                }

                if (NOME.length > 32) {
                    return interaction.reply({ content: `❌ | O nome não pode ter mais de 32 caracteres!`, ephemeral: true });
                } else {
                    tickets.set(`tickets.funcoes.${NOME}.nome`, NOME)
                }

                if (PREDESC.length > 64) {
                    return interaction.reply({ content: `❌ | A pré descrição não pode ter mais de 64 caracteres!`, ephemeral: true });
                } else {
                    tickets.set(`tickets.funcoes.${NOME}.predescricao`, PREDESC)
                }

                if (DESC !== '') {
                    if (DESC.length > 1024) {
                        return interaction.reply({ content: `❌ | A descrição não pode ter mais de 1024 caracteres!`, ephemeral: true });
                    } else {
                        tickets.set(`tickets.funcoes.${NOME}.descricao`, DESC)
                    }
                }

                if (BANNER !== '') {
                    const urlRegex = /^(ftp|http|https):\/\/[^ "]+$/;
                    if (!urlRegex.test(BANNER)) {
                        tickets.set(`tickets.funcoes.${NOME}.banner`, BANNER)
                        return interaction.reply({ message: dd, content: `❌ | Você escolheu incorretamente a URL do banner!`, ephemeral: true });
                    } else {
                        tickets.set(`tickets.funcoes.${NOME}.banner`, BANNER)
                    }
                }

                if (EMOJI !== '') {
                    const emojiRegex = /^<:.+:\d+>$|^<a:.+:\d+>$|^\p{Emoji}$/u;
                    if (!emojiRegex.test(EMOJI)) {
                        return interaction.reply({ content: `❌ | Você escolheu incorretamente o emoji!`, ephemeral: true });
                    } else {
                        tickets.set(`tickets.funcoes.${NOME}.emoji`, EMOJI)
                    }
                }

                await painelTicket(interaction)

                interaction.followUp({ content: `✅ | Função adicionada com sucesso!`, ephemeral: true });




            }

            if (interaction.customId == '0-89du0awd8awdaw8daw') {

                let TITULO = interaction.fields.getTextInputValue('tokenMP');
                let DESC = interaction.fields.getTextInputValue('tokenMP2');
                let BANNER = interaction.fields.getTextInputValue('tokenMP3');
                let COREMBED = interaction.fields.getTextInputValue('tokenMP5');

                if (TITULO.length > 256) {
                    return interaction.reply({ content: `❌ | O título não pode ter mais de 256 caracteres!`, ephemeral: true });
                }
                if (DESC.length > 1024) {
                    return interaction.reply({ content: `❌ | A descrição não pode ter mais de 1024 caracteres!`, ephemeral: true });
                }

                if (COREMBED !== '') {
                    const hexColorRegex = /^#?([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})$/;
                    if (!hexColorRegex.test(COREMBED)) {
                        
                        return interaction.reply({ content: `❌ Código Hex Color \`${COREMBED}\` inváldo, tente pegar [nesse site.](https://www.google.com/search?q=color+picker&oq=color+picker) `, ephemeral: true });
                    }else{
                        tickets.set(`tickets.aparencia.color`, COREMBED)
                    }
                }



                if (BANNER !== '') {
                    const urlRegex = /^(ftp|http|https):\/\/[^ "]+$/;
                    if (!urlRegex.test(BANNER)) {
                     
                        return interaction.reply({ message: dd, content: `❌ | Você escolheu incorretamente a URL do banner!`, ephemeral: true });
                    }else{
                        tickets.set(`tickets.aparencia.banner`, BANNER)
                    }
                }

                if (TITULO !== '') {
                    tickets.set(`tickets.aparencia.title`, TITULO)
                } else {
                    tickets.delete(`tickets.aparencia.title`)
                }

                if (DESC !== '') {
                    tickets.set(`tickets.aparencia.description`, DESC)
                } else {
                    tickets.delete(`tickets.aparencia.description`)
                }

                await painelTicket(interaction)


            }

      


            if (interaction.customId === 'aslfdjauydvaw769dg7waajnwndjo') {

                let VALOR = interaction.fields.getTextInputValue('tokenMP');
                let CARGO = interaction.fields.getTextInputValue('tokenMP2');


                if (CARGO !== '' && VALOR !== '') {
                    const role = await interaction.guild.roles.fetch(CARGO);

                    if (role === null) {
                        return interaction.reply({ content: `❌ | Você escolheu incorretamente o ID do cargo!`, ephemeral: true });
                    }

                    if (isNaN(VALOR)) {
                        return interaction.reply({ content: `❌ | Você escolheu incorretamente o valor!`, ephemeral: true });
                    }

                    configuracao.set(`posicoes.pos1.role`, CARGO);
                    configuracao.set(`posicoes.pos1.valor`, VALOR);
                } else {
                    configuracao.delete(`posicoes.pos1`);
                }

                await Posicao1(interaction, client)
                //  interaction.followUp({ content: `✅ | Posição definida com sucesso!`, ephemeral: true });

            }

            if (interaction.customId === 'awiohdbawudwdwhduawdnuaw') {

                let VALOR = interaction.fields.getTextInputValue('tokenMP');
                let CARGO = interaction.fields.getTextInputValue('tokenMP2');


                if (CARGO !== '' && VALOR !== '') {
                    const role = await interaction.guild.roles.fetch(CARGO);

                    if (role === null) {
                        return interaction.reply({ content: `❌ | Você escolheu incorretamente o ID do cargo!`, ephemeral: true });
                    }

                    if (isNaN(VALOR)) {
                        return interaction.reply({ content: `❌ | Você escolheu incorretamente o valor!`, ephemeral: true });
                    }

                    configuracao.set(`posicoes.pos2.role`, CARGO);
                    configuracao.set(`posicoes.pos2.valor`, VALOR);
                } else {
                    configuracao.delete(`posicoes.pos2`);
                }

                await Posicao1(interaction, client)
                // interaction.followUp({ content: `✅ | Posição definida com sucesso!`, ephemeral: true });
            }

            if (interaction.customId === 'uy82819171h172') {

                let VALOR = interaction.fields.getTextInputValue('tokenMP');
                let CARGO = interaction.fields.getTextInputValue('tokenMP2');

                if (CARGO !== '' && VALOR !== '') {
                    const role = await interaction.guild.roles.fetch(CARGO);

                    if (role === null) {
                        return interaction.reply({ content: `❌ | Você escolheu incorretamente o ID do cargo!`, ephemeral: true });
                    }

                    if (isNaN(VALOR)) {
                        return interaction.reply({ content: `❌ | Você escolheu incorretamente o valor!`, ephemeral: true });
                    }

                    configuracao.set(`posicoes.pos3.role`, CARGO);
                    configuracao.set(`posicoes.pos3.valor`, VALOR);
                } else {
                    configuracao.delete(`posicoes.pos3`);
                }

                await Posicao1(interaction, client)
                // interaction.followUp({ content: `✅ | Posição definida com sucesso!`, ephemeral: true });
            }


        }

        if (interaction.isAutocomplete()) {
            if (interaction.commandName == 'manage_item') {
                const nomeDigitado = interaction.options.getFocused().toLowerCase();
                const produtosFiltrados = produtos.filter(x => x.ID.toLowerCase().includes(nomeDigitado));
                const produtosSelecionados = produtosFiltrados.slice(0, 25);

                const config = produtosSelecionados.flatMap(x => {
                    const matchingFields = x.data.Campos.filter(iterator =>
                        iterator.Nome.toLowerCase().includes(nomeDigitado)
                    );

                    return matchingFields.map(iterator => ({
                        name: `🧵 ${x.data.Config.name} ➔ ${iterator.Nome}`,
                        value: `${x.ID}_${iterator.Nome}`,
                    }));
                });

                const response = config.length > 0
                    ? config
                    : [{ name: 'Nenhum produto registrado foi encontrado', value: 'nada' }];

                interaction.respond(response);
            }

            if (interaction.commandName == 'manage_stock') {
                const nomeDigitado = interaction.options.getFocused().toLowerCase();
                const produtosFiltrados = produtos.filter(x => x.ID.toLowerCase().includes(nomeDigitado));
                const produtosSelecionados = produtosFiltrados.slice(0, 25);

                const config = produtosSelecionados.flatMap(x => {
                    const matchingFields = x.data.Campos.filter(iterator =>
                        iterator.Nome.toLowerCase().includes(nomeDigitado)
                    );

                    return matchingFields.map(iterator => ({
                        name: `🧵 ${x.data.Config.name} ➔ ${iterator.Nome}`,
                        value: `${x.ID}_${iterator.Nome}`,
                    }));
                });

                const response = config.length > 0
                    ? config
                    : [{ name: 'Nenhum produto registrado foi encontrado', value: 'nada' }];

                interaction.respond(response);
            }

            if (interaction.commandName == 'manage_product') {
                var nomeDigitado = interaction.options.getFocused().toLowerCase();
                var produtosFiltrados = produtos.filter(x => x.ID.toLowerCase().includes(nomeDigitado));
                var produtosSelecionados = produtosFiltrados.slice(0, 25);

                const config = produtosSelecionados.map(x => {
                    return {
                        name: `🧵 ${x.data.Config.name}`,
                        value: `${x.ID}`
                    }
                })

                interaction.respond(!config.length ? [{ name: `Nenhum produto registrado foi encontrado`, value: `nada` }] : config);

            }
        }

        let valorticket
        if (interaction.isButton() && interaction.customId.startsWith('AbrirTicket_')) {
            valorticket = interaction.customId.replace('AbrirTicket_', '');
            return await CreateTicket(interaction, valorticket)
        } else if (interaction.isSelectMenu() && interaction.customId === 'abrirticket') {
            valorticket = interaction.values[0]
            return await CreateTicket(interaction, valorticket)
        }

        if (interaction.isSelectMenu()) {

            if (interaction.customId === 'solicitarrecebimento') {
                const ownerId = interaction.channel.ownerId || interaction.channel.name.split('・').pop();
                if (String(interaction.user.id) !== String(ownerId)) {
                    return interaction.reply({ content: '❌ | Somente o cliente deste ticket pode solicitar o recebimento.', ephemeral: true });
                }
                const compra = estatisticas.get(interaction.values[0]);
                if (!compra || String(compra.userid) !== String(ownerId)) {
                    return interaction.reply({ content: '❌ | Compra não encontrada para este ticket.', ephemeral: true });
                }
                await interaction.reply({ content: '✅ | Solicitação enviada à equipe. Aguarde o atendimento.', ephemeral: true });
                await interaction.channel.send({
                    content: `📦 <@&${configuracao.get('ConfigRoles.cargosup')}> <@${ownerId}> solicitou o recebimento de uma compra.`,
                    embeds: [new EmbedBuilder()
                        .setColor(configuracao.get('Cores.Processamento') || '#9400D3')
                        .setTitle('📦 Solicitação de recebimento')
                        .addFields(
                            { name: 'Produto', value: String(compra.produto || 'Não informado').slice(0, 1024) },
                            { name: 'Opção', value: String(compra.campo || 'Não informado').slice(0, 1024), inline: true },
                            { name: 'Quantidade', value: String(compra.quantidade || 1), inline: true },
                            { name: 'Pagamento', value: String(compra.idpagamento || interaction.values[0] || 'Não informado') }
                        )
                        .setFooter({ text: `Solicitado por ${interaction.user.tag}` })
                        .setTimestamp()]
                });
            }

            if(interaction.customId == 'asdihadbhawhdwhdaw'){


                const campo = interaction.values[0].split('_')[0]
                const produto = interaction.values[0].split('_')[1]


                GerenciarCampos2(interaction, campo, produto, true)

            }

            if(interaction.customId == 'stockhasdhvsudasd'){

                const campo = interaction.values[0].split('_')[0]
                const produto = interaction.values[0].split('_')[1]

                MessageStock(interaction, 1, produto, campo, true)


            }

            if (interaction.customId == 'deletarticketsfunction') {
                const valordelete = interaction.values
                for (const iterator of valordelete) {
                    tickets.delete(`tickets.funcoes.${iterator}`)
                }
                painelTicket(interaction)
            }



            // buton com customid AbrirTicket





        }


        if (interaction.isChannelSelectMenu()) {

            if (interaction.customId == 'canalpostarticket') {
                await interaction.reply({ content: `🔄 | Aguarde estamos criando sua mensagem!`, ephemeral: true });
                await CreateMessageTicket(interaction, interaction.values[0], client)
                interaction.editReply({ content: `✅ | Mensagem criada com sucesso!`, ephemeral: true });
            }

        }

        if (interaction.isButton()) {

            if (interaction.customId == 'sincronizarticket') {
                await interaction.reply({ content: `🔄 | Aguarde estamos atualizando suas mensagem!`, ephemeral: true });
                await Checkarmensagensticket(client)
                interaction.editReply({ content: `✅ | Mensagens atualizada com sucesso!`, ephemeral: true });
            }


            if (interaction.customId == 'arquivar') {

                if (!interaction.member.roles.cache.has(configuracao.get('ConfigRoles.cargoadm')) && !interaction.member.roles.cache.has(configuracao.get('ConfigRoles.cargosup'))) return interaction.reply({ content: `❌ | Você não tem permissão para fazer isso!`, ephemeral: true });

                try {
                    await interaction.message.delete()
                } catch (error) {

                }

                try {
                    await interaction.channel.setArchived(true)
                } catch (error) { }
            }

            if (interaction.customId == 'deletar') {

                if (!interaction.member.roles.cache.has(configuracao.get('ConfigRoles.cargoadm')) && !interaction.member.roles.cache.has(configuracao.get('ConfigRoles.cargosup'))) return interaction.reply({ content: `❌ | Você não tem permissão para fazer isso!`, ephemeral: true });

                try {
                    interaction.channel.delete()
                } catch (error) {

                }

            }



            if (['notificarticket', 'assumirticket', 'deletarsalvar'].includes(interaction.customId)) {
                const isStaff = interaction.member.roles.cache.has(configuracao.get('ConfigRoles.cargoadm')) ||
                    interaction.member.roles.cache.has(configuracao.get('ConfigRoles.cargosup'));
                if (!isStaff) return interaction.reply({ content: `❌ | Você não tem permissão para fazer isso!`, ephemeral: true });
            }

            if (interaction.customId === 'vercompras') {
                const ownerId = interaction.channel.ownerId || interaction.channel.name.split('・').pop();
                const compras = estatisticas.fetchAll()
                    .map(item => ({ key: item.ID, ...item.data }))
                    .filter(item => item && String(item.userid) === String(ownerId))
                    .sort((a, b) => Number(b.data || 0) - Number(a.data || 0));

                const embedCompras = new EmbedBuilder()
                    .setColor(configuracao.get('Cores.Principal') || '#9400D3')
                    .setTitle('🛍️ Compras encontradas')
                    .setDescription(compras.length ? 'Histórico de compras encontradas para este usuário:' : 'Nenhuma compra registrada para este usuário.')
                    .setFooter({ text: 'Compras encontradas • Shadow Games' })
                    .setTimestamp();

                if (compras.length) {
                    compras.slice(0, 25).forEach((compra, index) => {
                        const data = compra.data ? `<t:${Math.floor(Number(compra.data) / 1000)}:d>` : 'Data não registrada';
                        const valor = Number(compra.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                        embedCompras.addFields({
                            name: `${index + 1}. ${compra.produto || 'Produto'}`.slice(0, 256),
                            value: `**Status:** Entregue\n**Opção:** ${compra.campo || 'Não informada'}\n**Quantidade:** ${compra.quantidade || 1}\n**Valor:** R$ ${valor}\n**Data:** ${data}\n**Pagamento:** ${compra.idpagamento || 'Não informado'}`.slice(0, 1024),
                            inline: false
                        });
                    });
                }

                const selecionarCompra = compras.length ? new ActionRowBuilder().addComponents(
                    new Discord.StringSelectMenuBuilder()
                        .setCustomId('solicitarrecebimento')
                        .setPlaceholder('Selecione uma compra para solicitar o recebimento')
                        .addOptions(compras.slice(0, 25).map((compra, index) => ({
                            label: `${index + 1}. ${(compra.produto || 'Produto').slice(0, 70)}`,
                            description: `Pedido ${compra.idpagamento || compra.key}`.slice(0, 100),
                            value: String(compra.key)
                        })))
                ) : null;

                const fecharCompras = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('fecharcompras').setLabel('Fechar painel').setEmoji('✖️').setStyle(2)
                );
                return interaction.reply({ embeds: [embedCompras], components: selecionarCompra ? [selecionarCompra, fecharCompras] : [fecharCompras], ephemeral: true });
            }

            if (interaction.customId === 'fecharcompras') {
                return interaction.update({ embeds: [], content: '✅ | Painel de compras fechado.', components: [] });
            }

            if (interaction.customId === 'notificarticket') {
                await interaction.reply({ content: `✅ | A equipe foi notificada.`, ephemeral: true });
                try {
                    await interaction.channel.send({ content: `🔔 <@${interaction.user.id}> solicitou atendimento. <@&${configuracao.get('ConfigRoles.cargosup')}>` });
                } catch (error) { }
            }

            if (interaction.customId === 'assumirticket') {
                await interaction.reply({ content: `✅ | Ticket assumido por ${interaction.user}.`, ephemeral: false });
                try {
                    const ownerId = interaction.channel.ownerId || interaction.channel.name.split('・').pop();
                    await interaction.channel.setName(`atendimento・${interaction.user.username}・${ownerId}`);
                } catch (error) { }
            }

            if (interaction.customId === 'deletarsalvar') {
                const transcript = await interaction.channel.messages.fetch({ limit: 100 });
                const linhas = transcript.reverse().map(msg => {
                    const data = new Date(msg.createdTimestamp).toLocaleString('pt-BR');
                    const autor = msg.author?.tag || 'Usuário desconhecido';
                    return `[${data}] ${autor}: ${msg.cleanContent || '[anexo/componente]'}`;
                });
                const conteudo = linhas.join('\n').slice(0, 190000);
                const anexo = new Discord.AttachmentBuilder(Buffer.from(conteudo || 'Ticket sem mensagens.'), { name: `ticket-${interaction.channel.id}.txt` });
                const logId = configuracao.get('ConfigChannels.logpedidos') || configuracao.get('ConfigChannels.eventbuy');
                try {
                    const log = await client.channels.fetch(logId);
                    await log.send({ content: `📁 Ticket encerrado por ${interaction.user}.`, files: [anexo] });
                } catch (error) { }
                await interaction.reply({ content: `✅ | Ticket salvo. Este canal será excluído.`, ephemeral: true });
                setTimeout(() => interaction.channel.delete().catch(() => { }), 1000);
            }

            if (interaction.customId === 'suportenormal') {
                const ownerId = interaction.channel.ownerId || interaction.channel.name.split('・').pop();
                await interaction.reply({ content: `🆘 | Este ticket foi convertido em atendimento normal. A equipe ajudará você por aqui.`, ephemeral: false });
                try {
                    await interaction.channel.setName(`suporte・${interaction.user.username}・${ownerId}`);
                } catch (error) { }
            }

            if (interaction.customId == `postarticket`) {
                const ggg = tickets.get(`tickets.funcoes`)
                const ggg2 = tickets.get(`tickets.aparencia`)


                if (ggg == null || Object.keys(ggg).length == 0 || ggg2 == null || Object.keys(ggg2).length == 0) {
                    return interaction.reply({ content: `❌ Adicione uma função antes de postar a mensagem.`, ephemeral: true });
                } else {
                    const selectaaa = new Discord.ChannelSelectMenuBuilder()
                        .setCustomId('canalpostarticket')
                        .setPlaceholder('Clique aqui para selecionar')
                        .setChannelTypes(Discord.ChannelType.GuildText)

                    const row1 = new ActionRowBuilder()
                        .addComponents(selectaaa);

                    interaction.reply({ components: [row1], content: `Selecione o canal onde quer postar a mensagem.`, ephemeral: true, })

                }
            }



            if (interaction.customId == 'remfuncaoticket') {


                const ggg = tickets.get(`tickets.funcoes`)

             
                    
                if (ggg == null || Object.keys(ggg).length == 0) {
                    return interaction.reply({ content: `❌ Não existe nenhuma função criada para remover.`, ephemeral: true });
                }
                
                 else {

                    const selectMenuBuilder = new Discord.StringSelectMenuBuilder()
                        .setCustomId('deletarticketsfunction')
                        .setPlaceholder('Clique aqui para selecionar')
                        .setMinValues(0)

                    for (const chave in ggg) {
                        const item = ggg[chave];

                        const option = {
                            label: `${item.nome}`,
                            description: `${item.predescricao}`,
                            value: item.nome
                        };

                        selectMenuBuilder.addOptions(option);


                    }

                    selectMenuBuilder.setMaxValues(Object.keys(ggg).length)

                    const style2row = new ActionRowBuilder().addComponents(selectMenuBuilder);
                    try {
                        await interaction.update({ components: [style2row], content: `${interaction.user} Qual funções deseja remover?`, embeds: [] })
                    } catch (error) {
                    }
                }

            }


            if (interaction.customId == 'rendimento') {
                const row = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId("todayyyy")
                            .setLabel('Hoje')
                            .setStyle(2)
                            .setDisabled(false),
                        new ButtonBuilder()
                            .setCustomId("7daysss")
                            .setLabel('Últimos 7 dias')
                            .setStyle(2)
                            .setDisabled(false),
                        new ButtonBuilder()
                            .setCustomId("30dayss")
                            .setLabel('Últimos 30 dias')
                            .setStyle(2)
                            .setDisabled(false),
                        new ButtonBuilder()
                            .setCustomId("totalrendimento")
                            .setLabel('Rendimento Total')
                            .setStyle(3)
                            .setDisabled(false),
                    )
                interaction.reply({ content: `Olá senhor **${interaction.user.username}**, selecione algum filtro.`, components: [row], ephemeral: true })
            }

            if (interaction.customId == 'gerenciarposicao') {

                Posicao1(interaction, client)

            }



            if (interaction.customId == 'Editarprimeiraposição') {

                const aa = configuracao.get(`posicoes`)

                const modalaAA = new ModalBuilder()
                    .setCustomId('aslfdjauydvaw769dg7waajnwndjo')
                    .setTitle(`Definir primeira posição`);

                const newnameboteN = new TextInputBuilder()
                    .setCustomId('tokenMP')
                    .setLabel(`VALOR`)
                    .setPlaceholder(`Insira uma quantia, ex: 100`)
                    .setValue(aa?.pos1?.valor == undefined ? '' : aa.pos1?.valor)
                    .setStyle(TextInputStyle.Short)
                    .setRequired(false)

                const newnameboteN2 = new TextInputBuilder()
                    .setCustomId('tokenMP2')
                    .setLabel(`CARGO`)
                    .setPlaceholder(`Insira um id de algum cargo`)
                    .setValue(aa?.pos1?.role == undefined ? '' : aa.pos1?.role)
                    .setStyle(TextInputStyle.Short)
                    .setRequired(false)

                const firstActionRow3 = new ActionRowBuilder().addComponents(newnameboteN);
                const firstActionRow4 = new ActionRowBuilder().addComponents(newnameboteN2);

                modalaAA.addComponents(firstActionRow3, firstActionRow4);

                await interaction.showModal(modalaAA);
            }

            if (interaction.customId == 'Editarsegundaposição') {
                const aa = configuracao.get(`posicoes`)

                const modalaAA = new ModalBuilder()
                    .setCustomId('awiohdbawudwdwhduawdnuaw')
                    .setTitle(`Definir segunda posição`);

                const newnameboteN = new TextInputBuilder()
                    .setCustomId('tokenMP')
                    .setLabel(`VALOR`)
                    .setPlaceholder(`Insira uma quantia, ex: 100`)
                    .setValue(aa?.pos2?.valor == undefined ? '' : aa.pos2?.valor)
                    .setStyle(TextInputStyle.Short)
                    .setRequired(false)

                const newnameboteN2 = new TextInputBuilder()
                    .setCustomId('tokenMP2')
                    .setLabel(`CARGO`)
                    .setPlaceholder(`Insira um id de algum cargo`)
                    .setValue(aa?.pos2?.role == undefined ? '' : aa.pos2?.role)
                    .setStyle(TextInputStyle.Short)
                    .setRequired(false)

                const firstActionRow3 = new ActionRowBuilder().addComponents(newnameboteN);
                const firstActionRow4 = new ActionRowBuilder().addComponents(newnameboteN2);

                modalaAA.addComponents(firstActionRow3, firstActionRow4);

                await interaction.showModal(modalaAA);
            }

            if (interaction.customId == 'Editarterceiraposição') {
                const aa = configuracao.get(`posicoes`)
                const modalaAA = new ModalBuilder()
                    .setCustomId('uy82819171h172')
                    .setTitle(`Definir terceira posição`);

                const newnameboteN = new TextInputBuilder()
                    .setCustomId('tokenMP')
                    .setLabel(`VALOR`)
                    .setPlaceholder(`Insira uma quantia, ex: 100`)
                    .setValue(aa?.pos3?.valor == undefined ? '' : aa.pos3?.valor)
                    .setStyle(TextInputStyle.Short)
                    .setRequired(false)

                const newnameboteN2 = new TextInputBuilder()
                    .setCustomId('tokenMP2')
                    .setLabel(`CARGO`)
                    .setPlaceholder(`Insira um id de algum cargo`)
                    .setValue(aa?.pos3?.role == undefined ? '' : aa.pos3?.role)
                    .setStyle(TextInputStyle.Short)
                    .setRequired(false)

                const firstActionRow3 = new ActionRowBuilder().addComponents(newnameboteN);
                const firstActionRow4 = new ActionRowBuilder().addComponents(newnameboteN2);

                modalaAA.addComponents(firstActionRow3, firstActionRow4);

                await interaction.showModal(modalaAA);
            }


            if (interaction.customId == 'todayyyy' || interaction.customId == '7daysss' || interaction.customId == '30dayss' || interaction.customId == 'totalrendimento') {

                let rendimento
                let name

                if (interaction.customId == 'todayyyy') {
                    rendimento = await EstatisticasNode.SalesToday()
                    name = 'Resumo das vendas de hoje'
                } else if (interaction.customId == '7daysss') {
                    rendimento = await EstatisticasNode.SalesWeek()
                    name = 'Resumo das vendas nos últimos 7 dias'
                } else if (interaction.customId == '30dayss') {
                    rendimento = await EstatisticasNode.SalesMonth()
                    name = 'Resumo das vendas nos últimos 30 dias'
                } else if (interaction.customId == 'totalrendimento') {
                    name = 'Resumo geral de todas as vendas'
                    rendimento = await EstatisticasNode.SalesTotal()
                }


                const embed = new EmbedBuilder()
                    .setColor(`${configuracao.get(`Cores.Principal`) == null ? `#635b44` : configuracao.get(`Cores.Principal`)}`) //635b44
                    .setTitle(`${name}`)
                    .addFields(
                        { name: `**Rendimento**`, value: `\`R$ ${Number(rendimento.rendimentoTotal).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\``, inline: true },
                        { name: `**Pedidos aprovados**`, value: `\`${rendimento.quantidadeTotal}\``, inline: true },
                        { name: `**Produtos entregues**`, value: `\`${rendimento.produtosEntregue}\``, inline: true },
                    )
                    .setAuthor({ name: `${interaction.user.username}` })
                    .setTimestamp()
                    .setFooter({ text: `${interaction.user.username}` })

                interaction.update({ embeds: [embed] })
            }



            if (interaction.customId.startsWith('criarrrr')) {

                const modalaAA = new ModalBuilder()
                    .setCustomId('sdaju11111idsjjsdua')
                    .setTitle(`Criação`);

                const newnameboteN = new TextInputBuilder()
                    .setCustomId('tokenMP')
                    .setLabel(`NOME`)
                    .setPlaceholder(`Insira o nome do seu produto`)
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)

                const newnameboteN2 = new TextInputBuilder()
                    .setCustomId('tokenMP2')
                    .setLabel(`DESCRIÇÃO`)
                    .setPlaceholder(`Insira uma descrição para seu produto`)
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(true)
                    .setMaxLength(1024)

                const newnameboteN4 = new TextInputBuilder()
                    .setCustomId('tokenMP3')
                    .setLabel(`ENTREGA AUTOMÁTICA?`)
                    .setPlaceholder(`Digite "sim" ou "não"`)
                    .setStyle(TextInputStyle.Short)
                    .setMaxLength(3)
                    .setRequired(true)

                const newnameboteN5 = new TextInputBuilder()
                    .setCustomId('tokenMP4')
                    .setLabel(`ICONE (OPCIONAL)`)
                    .setPlaceholder(`Insira uma URL de uma imagem ou gif`)
                    .setStyle(TextInputStyle.Short)
                    .setRequired(false)

                const newnameboteN6 = new TextInputBuilder()
                    .setCustomId('tokenMP5')
                    .setLabel(`BANNER (OPCIONAL)`)
                    .setPlaceholder(`Insira uma URL de uma imagem ou gif`)
                    .setStyle(TextInputStyle.Short)
                    .setRequired(false)

                const firstActionRow3 = new ActionRowBuilder().addComponents(newnameboteN);
                const firstActionRow4 = new ActionRowBuilder().addComponents(newnameboteN2);
                const firstActionRow5 = new ActionRowBuilder().addComponents(newnameboteN4);
                const firstActionRow6 = new ActionRowBuilder().addComponents(newnameboteN5);
                const firstActionRow7 = new ActionRowBuilder().addComponents(newnameboteN6);



                modalaAA.addComponents(firstActionRow3, firstActionRow4, firstActionRow5, firstActionRow6, firstActionRow7);
                await interaction.showModal(modalaAA);

            }

            if (interaction.customId.startsWith('voltar1')) {

                Painel(interaction, client)

            }


            if (interaction.customId.startsWith('addfuncaoticket')) {

                const dd = tickets.get('tickets.funcoes')
               
                
                if (dd && Object.keys(dd).length > 24) {
                    return interaction.reply({ content: `❌ | Você não pode criar mais de 24 funções em seu TICKET!` });
                }
                  
                const modalaAA = new ModalBuilder()
                    .setCustomId('sdaju11111231idsj1233js123dua123')
                    .setTitle(`Adicionar função`);

                const newnameboteN = new TextInputBuilder()
                    .setCustomId('tokenMP')
                    .setLabel(`NOME DA FUNÇÃO`)
                    .setPlaceholder(`Insira aqui um nome, como: Suporte`)
                    .setStyle(TextInputStyle.Short)

                    .setRequired(true)

                const newnameboteN2 = new TextInputBuilder()
                    .setCustomId('tokenMP2')
                    .setLabel(`PRÉ DESCRIÇÃO`)
                    .setPlaceholder(`Insira aqui uma pré descrição, ex: "Preciso de suporte."`)
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
                    .setMaxLength(99)

                const newnameboteN4 = new TextInputBuilder()
                    .setCustomId('tokenMP3')
                    .setLabel(`DESCRIÇÃO`)
                    .setPlaceholder(`Insira aqui a descrição da função.`)
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(false)
                    .setMaxLength(99)

                const newnameboteN5 = new TextInputBuilder()
                    .setCustomId('tokenMP5')
                    .setLabel(`BANNER (OPCIONAL)`)
                    .setPlaceholder(`Insira aqui uma URL de uma imagem ou GIF`)
                    .setStyle(TextInputStyle.Short)
                    .setRequired(false)

                const newnameboteN6 = new TextInputBuilder()
                    .setCustomId('tokenMP6')
                    .setLabel(`EMOJI DA FUNÇÃO`)
                    .setPlaceholder(`Insira um nome ou id de um emoji do servidor.`)
                    .setStyle(TextInputStyle.Short)
                    .setRequired(false)

                const firstActionRow3 = new ActionRowBuilder().addComponents(newnameboteN);
                const firstActionRow4 = new ActionRowBuilder().addComponents(newnameboteN2);
                const firstActionRow5 = new ActionRowBuilder().addComponents(newnameboteN4);
                const firstActionRow6 = new ActionRowBuilder().addComponents(newnameboteN5);
                const firstActionRow7 = new ActionRowBuilder().addComponents(newnameboteN6);


                modalaAA.addComponents(firstActionRow3, firstActionRow4, firstActionRow5, firstActionRow6, firstActionRow7);
                await interaction.showModal(modalaAA);

            }
            if (interaction.customId.startsWith('definiraparencia')) {



                const modalaAA = new ModalBuilder()
                    .setCustomId('0-89du0awd8awdaw8daw')
                    .setTitle(`Editar Ticket`);

                const dd = tickets.get(`tickets.aparencia`)

                const newnameboteN = new TextInputBuilder()
                    .setCustomId('tokenMP')
                    .setLabel(`TITULO`)
                    .setPlaceholder(`Insira aqui um nome, como: Entrar em contato`)
                    .setStyle(TextInputStyle.Short)
                    .setValue(dd?.title == undefined ? '' : dd.title)
                    .setRequired(true)


                const newnameboteN2 = new TextInputBuilder()
                    .setCustomId('tokenMP2')
                    .setLabel(`DESCRIÇÃO`)
                    .setPlaceholder(`Insira aqui uma descrição.`)
                    .setStyle(TextInputStyle.Paragraph)
                    .setValue(dd?.description == undefined ? '' : dd.description)
                    .setMaxLength(500)
                    .setRequired(true)


                const newnameboteN4 = new TextInputBuilder()
                    .setCustomId('tokenMP3')
                    .setLabel(`BANNER (OPCIONAL)`)
                    .setPlaceholder(`Insira aqui uma URL de uma imagem ou GIF`)
                    .setStyle(TextInputStyle.Short)
                    .setValue(dd?.banner == undefined ? '' : dd.banner)
                    .setRequired(false)



                const newnameboteN5 = new TextInputBuilder()
                    .setCustomId('tokenMP5')
                    .setLabel(`COR DO EMBED (OPCIONAL)`)
                    .setPlaceholder(`Insira aqui um código Hex Color, ex: FFFFFF`)
                    .setStyle(TextInputStyle.Short)
                    .setValue(dd?.color == undefined ? '' : dd.color)
                    .setRequired(false)


                const firstActionRow3 = new ActionRowBuilder().addComponents(newnameboteN);
                const firstActionRow4 = new ActionRowBuilder().addComponents(newnameboteN2);
                const firstActionRow5 = new ActionRowBuilder().addComponents(newnameboteN4);
                const firstActionRow6 = new ActionRowBuilder().addComponents(newnameboteN5);

                modalaAA.addComponents(firstActionRow3, firstActionRow4, firstActionRow5, firstActionRow6);
                await interaction.showModal(modalaAA);



            }

            if (interaction.customId.startsWith('painelconfigticket')) {


                painelTicket(interaction)


            }



            if (interaction.customId.startsWith('personalizarbot')) {

                const modalaAA = new ModalBuilder()
                    .setCustomId('sdaju11111231idsjjs123dua123')
                    .setTitle(`Editar perfil do bot`);

                const newnameboteN = new TextInputBuilder()
                    .setCustomId('tokenMP')
                    .setLabel(`NOME DE USUÁRIO`)
                    .setValue(`${client.user.username}`)
                    .setPlaceholder(`Insira um nome de usuário (só pode mudar 3x por hora)`)
                    .setStyle(TextInputStyle.Short)
                    .setRequired(false)

                const newnameboteN2 = new TextInputBuilder()
                    .setCustomId('tokenMP2')
                    .setLabel(`AVATAR`)
                    .setPlaceholder(`Insira uma URL de um ícone`)
                    .setStyle(TextInputStyle.Short)
                    .setRequired(false)

                const newnameboteN4 = new TextInputBuilder()
                    .setCustomId('tokenMP3')
                    .setLabel(`STATUS 1`)
                    .setPlaceholder(`Insira aqui um status personalizado`)
                    //.setValue(`COLOCA AQUI O STATUS 1`)
                    .setStyle(TextInputStyle.Short)
                    .setRequired(false)

                const newnameboteN5 = new TextInputBuilder()
                    .setCustomId('tokenMP5')
                    .setLabel(`STATUS 2`)
                    //.setValue(`COLOCA AQUI O STATUS 2`)
                    .setPlaceholder(`Insira aqui um status personalizado`)
                    .setStyle(TextInputStyle.Short)
                    .setRequired(false)

                const firstActionRow3 = new ActionRowBuilder().addComponents(newnameboteN);
                const firstActionRow4 = new ActionRowBuilder().addComponents(newnameboteN2);
                const firstActionRow5 = new ActionRowBuilder().addComponents(newnameboteN4);
                const firstActionRow6 = new ActionRowBuilder().addComponents(newnameboteN5);

                modalaAA.addComponents(firstActionRow3, firstActionRow4, firstActionRow5, firstActionRow6);
                await interaction.showModal(modalaAA);

            }


            if (interaction.customId.startsWith('coresembeds')) {

                const modalaAA = new ModalBuilder()
                    .setCustomId('sdaju11111idsjjs123dua123')
                    .setTitle(`Editar cores dos embeds`);

                const newnameboteN = new TextInputBuilder()
                    .setCustomId('tokenMP')
                    .setLabel(`COR PRINCIPAL`)
                    .setPlaceholder(`Insira aqui um código Hex Color, ex: #Obd4cd`)
                    .setStyle(TextInputStyle.Short)
                    .setRequired(false)

                const newnameboteN2 = new TextInputBuilder()
                    .setCustomId('tokenMP2')
                    .setLabel(`COR DE PROCESSAMENTO`)
                    .setPlaceholder(`Insira aqui um código Hex Color, ex: #fcba03`)
                    .setStyle(TextInputStyle.Short)
                    .setRequired(false)

                const newnameboteN4 = new TextInputBuilder()
                    .setCustomId('tokenMP3')
                    .setLabel(`COR DE SUCESSO`)
                    .setPlaceholder(`Insira aqui um código Hex Color, ex: #39fc03`)
                    .setStyle(TextInputStyle.Short)
                    .setRequired(false)

                const newnameboteN5 = new TextInputBuilder()
                    .setCustomId('tokenMP5')
                    .setLabel(`COR DE FALHA`)
                    .setPlaceholder(`Insira aqui um código Hex Color, ex: #ff0000`)
                    .setStyle(TextInputStyle.Short)
                    .setRequired(false)

                const newnameboteN6 = new TextInputBuilder()
                    .setCustomId('tokenMP6')
                    .setLabel(`COR DE FINALIZADO`)
                    .setPlaceholder(`Insira aqui um código Hex Color, ex: #7363ff`)
                    .setStyle(TextInputStyle.Short)
                    .setRequired(false)

                const firstActionRow3 = new ActionRowBuilder().addComponents(newnameboteN);
                const firstActionRow4 = new ActionRowBuilder().addComponents(newnameboteN2);
                const firstActionRow5 = new ActionRowBuilder().addComponents(newnameboteN4);
                const firstActionRow6 = new ActionRowBuilder().addComponents(newnameboteN5);
                const firstActionRow7 = new ActionRowBuilder().addComponents(newnameboteN6);



                modalaAA.addComponents(firstActionRow3, firstActionRow4, firstActionRow5, firstActionRow6, firstActionRow7);
                await interaction.showModal(modalaAA);

            }



            if (interaction.customId.startsWith('voltar2')) {

                Gerenciar(interaction, client)

            }

            if (interaction.customId.startsWith('gerenciarconfigs')) {
                Gerenciar(interaction, client)
            }

            if (interaction.customId.startsWith('configcargos')) {
                ConfigRoles(interaction, client)
            }
            if (interaction.customId.startsWith('painelpersonalizar')) {


                const row2 = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId("coresembeds")
                            .setLabel('Editar cores dos embeds')
                            .setEmoji(`1178080366871973958`)
                            .setStyle(1),

                        new ButtonBuilder()
                            .setCustomId("personalizarbot")
                            .setLabel('Personalizar Bot')
                            .setEmoji(`1178080828933283960`)
                            .setStyle(1),

                        new ButtonBuilder()
                            .setCustomId("definirtema")
                            .setLabel('Definir tema')
                            .setEmoji(`1178066208835252266`)
                            .setDisabled(true)
                            .setStyle(1)
                    )

                const row3 = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId("voltar1")
                            .setLabel('Voltar')
                            .setEmoji(`1178068047202893869`)
                            .setStyle(2)
                    )

                interaction.update({ embeds: [], components: [row2, row3], content: `Escolha uma opção e use sua criatividade e profissionalismo ;) ` })


            }
            if (interaction.customId.startsWith('painelconfigbv')) {

                msgbemvindo(interaction, client)

            }

            if (interaction.customId.startsWith('voltar3')) {

                Gerenciar2(interaction, client)

            }

            if (interaction.customId.startsWith('voltar00')) {

                Painel(interaction, client)

            }


            if (interaction.customId.startsWith('painelconfigvendas')) {


                Gerenciar2(interaction, client)





            }



        }
    }
}
