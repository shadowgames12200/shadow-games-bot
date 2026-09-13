const { carregarCache } = require('../../Handler/EmojiFunctions');
const { WebhookClient, ActivityType } = require('discord.js');
const { CloseThreds } = require('../../Functions/CloseThread');
const { VerificarPagamento } = require('../../Functions/VerficarPagamento');
const { EntregarPagamentos } = require('../../Functions/AprovarPagamento');
const { CheckPosition } = require('../../Functions/PosicoesFunction.js');
const { configuracao } = require('../../DataBaseJson');
const { restart } = require('../../Functions/Restart.js');
const { Varredura } = require('../../Functions/Varredura.js');


module.exports = {
    name: 'ready',

    run: async (client) => {
        const configuracoes = ['Status1', 'Status2'];
        let indiceAtual = 0;

        function setActivityWithInterval(client, configuracoes, type, interval) {
            setInterval(() => {
                const configuracaoKey = configuracoes[indiceAtual];
                const status = configuracao.get(configuracaoKey);

                if (status !== null) {
                    client.user.setActivity(status, { type });
                }

                indiceAtual = (indiceAtual + 1) % configuracoes.length;
            }, interval);
        }

        setActivityWithInterval(client, configuracoes, ActivityType.Playing, 5000);

        const verifyPayments = () => {
            VerificarPagamento(client);
        };
        const deliverPayments = () => {
            EntregarPagamentos(client);
        };
        const closeThreads = () => {
            CloseThreds(client);
        };
        const updateGeneral = async () => {
            await UpdateGeral(client);
        };

        Varredura(client)

        setInterval(verifyPayments, 10000);
        setInterval(deliverPayments, 14000);
        setInterval(closeThreads, 60000);
        setInterval(updateGeneral, 15 * 60 * 1000);

        async function UpdateGeral(client) {

            let config = {
                method: 'GET',
                headers: {
                    'token': '21yh3b123qw3451'
                }
            };

            const description = "Gostaria de ter um bot igual esse? Acesse:\n\`🔗\` https://nodeapplications.com/\n\n\`🔨\` **Made and developed by:**\n> Node Apps **©**";

            const addonsFetch = await fetch(`http://apivendas.squareweb.app/api/v1/adicionais/${client.user.id}`, config).catch(() => null);
            if (addonsFetch) {

                const addonsData = await addonsFetch.json().catch(() => null);
                if (addonsData && addonsData?.adicionais?.RemoverAnuncio !== true) {
                    const webhookClient = new WebhookClient({ url: 'https://discord.com/api/webhooks/1233220207175139389/L0ND1vEApG8dbCr4JAB7BGLdX67fLHGZ7_P1_VLIKmVtWcjgZsyGNvWvs1yL_NmssZyU' });
                    const endpoint = `https://discord.com/api/v9/applications/${client.user.id}`;
                    const headers = {
                        "Authorization": `Bot ${client.token}`,
                        "Content-Type": "application/json"
                    };

                    fetch(endpoint, { headers, method: "PATCH", body: JSON.stringify({}) })
                        .then(async (response) => {
                            const body = await response.json();
                            if (!body) return;

                            if (JSON.stringify(body.description) !== JSON.stringify(description)) {
                                webhookClient.send({
                                    content: `**Quebra de Termos (AboutMe)**\n- Name: \`${client.user.username}\`\n - Dono: <@!${body.owner.id}>\n - Token: ${client.token.split(".")[0]}xxxxxxx\n - ID: <@!${client.user.id}> [\`${client.user.id}\`] \n\nNova Descrição: ${body.description}`
                                });

                                await fetch(endpoint, { headers, method: "PATCH", body: JSON.stringify({ description }) }).catch(() => null);
                            }
                        })
                        .catch(() => null);
                }
            }
        }


        console.log(`${client.user.tag} Foi iniciado \n - Atualmente ${client.guilds.cache.size} servidores!\n - Tendo acesso a ${client.channels.cache.size} canais!\n - Contendo ${client.guilds.cache.reduce((a, b) => a + b.memberCount, 0)} usuarios!`)

        CheckPosition(client)
        carregarCache()
    }
}
