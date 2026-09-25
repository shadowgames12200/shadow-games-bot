
const config = require("../config.json");

function AtivarIntents() {

    fetch('https://discord.com/api/v10/users/@me', {
        headers: {
            Authorization: `Bot ${config.token}`,
        },
    })
        .then((response) => {
            if (!response.ok) throw new Error(`Discord /users/@me respondeu HTTP ${response.status}`)
            const contentType = response.headers.get('content-type') || ''
            if (!contentType.includes('application/json')) throw new Error(`Discord respondeu ${contentType || 'conteúdo não JSON'}`)
            return response.json();
        })
        .then((data) => {
            if (!data?.id) throw new Error('Discord não retornou o ID da aplicação')
            const url = `https://discord.com/api/v10/applications/${data.id}`;
            fetch(url, {
                method: "PATCH",
                headers: {
                    Authorization: `Bot ${config.token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    "flags": 8953856,
                    //"description": `**➜  Storm Apps (Vendas V2)**\n> https://discord.gg/stormbots`
                    //description: `:raio_azurlu: Bot de Vendas Automáticas, seu aliado para impulsionar suas vendas online.\n\n> **Mensalidade fixa e sem taxas adicionais sobre suas vendas.**\n> Quer saber mais? Acesse o nosso Discord em\n> https://discord.gg/stormbots`,
                }),
            }).catch((error) => console.error('[StartIntents] Falha ao atualizar flags:', error.message));

        })
        .catch((error) => console.error('[StartIntents] Discord indisponível; seguindo inicialização:', error.message))
}




module.exports = {
    AtivarIntents
}
