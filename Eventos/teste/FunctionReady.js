const { carregarCache } = require('../../Handler/EmojiFunctions');
const { ActivityType } = require('discord.js');
const { CloseThreds } = require('../../Functions/CloseThread');
const { VerificarPagamento } = require('../../Functions/VerficarPagamento');
const { EntregarPagamentos } = require('../../Functions/AprovarPagamento');
const { CheckPosition } = require('../../Functions/PosicoesFunction.js');
const { configuracao } = require('../../DataBaseJson');

module.exports = {
    name: 'ready',

    run: async (client) => {
        const configuracoes = ['Status1', 'Status2'];
        let indiceAtual = 0;
        let verificandoPagamentos = false;
        let entregandoPagamentos = false;
        let fechandoThreads = false;

        setInterval(() => {
            const configuracaoKey = configuracoes[indiceAtual];
            const status = configuracao.get(configuracaoKey);
            if (status) client.user.setActivity(status, { type: ActivityType.Playing });
            indiceAtual = (indiceAtual + 1) % configuracoes.length;
        }, 5000);

        setInterval(async () => {
            if (verificandoPagamentos) return;
            verificandoPagamentos = true;
            try { await VerificarPagamento(client); }
            catch (error) { console.error('[Pagamentos] Falha na verificação:', error); }
            finally { verificandoPagamentos = false; }
        }, 10000);

        setInterval(async () => {
            if (entregandoPagamentos) return;
            entregandoPagamentos = true;
            try { await EntregarPagamentos(client); }
            catch (error) { console.error('[Pagamentos] Falha na entrega:', error); }
            finally { entregandoPagamentos = false; }
        }, 14000);

        setInterval(async () => {
            if (fechandoThreads) return;
            fechandoThreads = true;
            try { await CloseThreds(client); }
            catch (error) { console.error('[Tickets] Falha ao fechar threads:', error); }
            finally { fechandoThreads = false; }
        }, 60000);

        console.log(`${client.user.tag} foi iniciado\n - Atualmente ${client.guilds.cache.size} servidores!\n - Tendo acesso a ${client.channels.cache.size} canais!\n - Contendo ${client.guilds.cache.reduce((a, b) => a + b.memberCount, 0)} usuários!`);

        await CheckPosition(client).catch((error) => console.error('[CheckPosition]', error));
        try { carregarCache(); } catch (error) { console.error('[EmojiCache]', error); }
    }
};
