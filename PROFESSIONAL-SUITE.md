# Shadow Games — Professional Suite

Este pacote adiciona os recursos pedidos ao bot existente: **reaction roles, starboard, sugestões, AutoMod, logs gerais, comandos personalizados, boas-vindas e despedidas, formulário antes do ticket, fechamento automático por inatividade, encaminhamento por equipe, estatísticas de atendimento, transcripts em página web, dashboard web e permissões detalhadas por função**.

## Instalação

1. Instale as dependências com `npm install`.
2. Defina os segredos fora do código: `DISCORD_TOKEN=seu_token MP_ACCESS_TOKEN=seu_token_mp npm start`.
3. Ative no Developer Portal os intents **Guild Members**, **Message Content** e **Message Reactions**.
4. Inicie o bot com `npm start`.

O token que veio no projeto anterior foi removido do arquivo de configuração por segurança. Como ele foi exposto no pacote anterior, gere um novo token no Developer Portal antes de colocar o bot em produção.

O token do Mercado Pago também deve ser renovado, pois a credencial anterior foi exposta. O bot prioriza `MP_ACCESS_TOKEN`; não coloque credenciais em `configuracao.json`.

O pagamento agora possui seleção em tempo de execução para **Efí Bank, Banco Inter, Banco do Brasil e Asaas**. Use `/profissional pagamento` para escolher o provedor e o ambiente. O dashboard também expõe `/api/payments/providers` e `/api/payments/status`. As credenciais específicas ficam somente em variáveis de ambiente; o bot inicia em modo sandbox até que um provedor seja configurado.

Variáveis esperadas: Efí (`EFI_CLIENT_ID`, `EFI_CLIENT_SECRET`, `EFI_CERT_PATH`, `EFI_KEY_PATH`, `EFI_PIX_KEY`); Inter (`INTER_CLIENT_ID`, `INTER_CLIENT_SECRET`, `INTER_CERT_PATH`, `INTER_KEY_PATH`, `INTER_PIX_KEY`); BB (`BB_CLIENT_ID`, `BB_CLIENT_SECRET`, `BB_CERT_PATH`, `BB_KEY_PATH`, `BB_PIX_KEY`); Asaas (`ASAAS_API_KEY`, `ASAAS_PIX_KEY`). A camada de seleção e recebimento idempotente de webhooks está pronta; a emissão de cobranças em produção depende de credenciais válidas, certificados quando exigidos e configuração dos endpoints oficiais do provedor escolhido.

## Configuração

Depois de iniciar o bot, os administradores usam o comando slash **`/profissional`**. Subcomandos disponíveis: `status`, `canal`, `starboard`, `reaction-role`, `sugestao`, `tickets`, `automod`, `comando`, `permissao`, `painel-ticket`, `equipe`, `formulario` e `painel-equipe`. Assim, a configuração principal não precisa mais ser feita editando o JSON manualmente. O comando **`/moderar`** também fornece `timeout`, `expulsar`, `banir` e `limpar`.

A fase 3 adiciona AutoMod com anti-spam por janela, bloqueio de convites, exceções por canal/cargo e timeout; auditoria persistente; starboard dinâmico; tickets com status, SLA, equipes, formulários e métricas; transcripts com anexos; e rotas administrativas no dashboard (`/api/audit` e `/api/config`).

Fluxo recomendado: use `/profissional equipe` para criar departamentos como vendas, suporte e financeiro; `/profissional formulario` para definir perguntas por departamento; `/profissional painel-equipe` para publicar cada painel; `/profissional canal` para logs, sugestões e boas-vindas; `/profissional tickets` para categoria e inatividade; `/profissional automod` para as regras; `/profissional starboard` para definir o canal; e `/profissional reaction-role` para vincular uma mensagem a um cargo.

A suíte cria `DataBaseJson/professional.json` automaticamente. Edite os IDs em `settings` e reinicie o bot quando necessário.

- `logChannelId`, `welcomeChannelId`, `goodbyeChannelId`: canais de auditoria e ciclo de membros.
- `suggestionChannelId`: canal de sugestões.
- `ticketCategoryId` e `ticketTeamRoleId`: categoria e cargo da equipe de atendimento.
- `inactivityHours`: prazo para fechamento automático; padrão de 72 horas.
- `automod.blockedWords`, `maxMentions` e `maxLinksPerMinute`: regras do AutoMod.
- `customCommands`: mapa no formato `{ "regras": "texto da resposta" }` para comandos `!regras`.
- `reactionRoles`: mapa `{ "ID_DA_MENSAGEM": { "emoji": "ID_DO_CARGO" } }`.
- `permissions`: listas de IDs de cargos por operação, como `closeTicket`, `claimTicket` e `moderateSuggestions`.

Para abrir tickets, envie ou adapte um botão com `customId` igual a `ticket_open`. O usuário preencherá assunto e detalhes antes de o canal ser criado.

## Dashboard e transcripts

O dashboard local fica em `http://localhost:8787` por padrão. Use `DASHBOARD_PORT` para alterar a porta. Endpoints disponíveis: `/health`, `/api/stats`, `/api/transcripts` e `/transcripts/:id`. Se `DASHBOARD_TOKEN` estiver definido, todas as rotas `/api/*` e `/transcripts/*` exigem `Authorization: Bearer SEU_TOKEN`; `/health` permanece público para monitoramento.

Antes de publicar o dashboard na internet, coloque-o atrás de autenticação, HTTPS e um proxy reverso. O código inclui apenas a camada funcional local para evitar expor dados de atendimento sem configuração de segurança.

Não foram incluídos XP, níveis, ranking, recompensas, comandos de diversão, sistema social, notificações de YouTube/Twitch, RSS ou módulos de engajamento, conforme solicitado.

## Checklist de produção

- Substituir o token exposto e revisar permissões do bot.
- Conceder somente permissões necessárias: View Channels, Send Messages, Manage Messages, Moderate Members e Manage Threads/Channels conforme o fluxo escolhido.
- Configurar os IDs em `professional.json`.
- Testar abertura, encaminhamento, fechamento e transcript com uma conta de teste.
- Fazer backup de `DataBaseJson` antes de atualizar o bot.
- Os backups automáticos ficam em `DataBaseJson/backups` e são criados no boot e a cada 6 horas, mantendo os últimos 14 arquivos.
- Antes de remover bots antigos, faça um teste de aceitação no servidor real: compra, pagamento, entrega, ticket por equipe, transcript, AutoMod, logs, reaction role e starboard.
