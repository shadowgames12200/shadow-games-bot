# Integração Pix da Efí — Shadow Games Bot

## Fluxo implementado

1. No carrinho, o comprador escolhe Pix.
2. O bot cria uma cobrança imediata Pix (`POST /v2/cob`) na conta Efí, com validade de 10 minutos e sem enviar o objeto `devedor`; portanto, o bot não solicita CPF/CNPJ do comprador.
3. O bot mostra o QR Code e um botão **Copiar Pix Copia e Cola** no canal do pedido.
4. A cada ciclo já existente de verificação (aproximadamente 10 segundos), o bot consulta a cobrança na API Efí por mTLS.
5. Só inicia a entrega se a cobrança estiver `CONCLUIDA` **e** o total recebido corresponder exatamente ao valor do pedido. Cobrança com valor diferente fica suspensa para conferência; webhook, mensagem do comprador ou imagem de comprovante não libera produto.
6. A confirmação entra na fila atual do bot, que entrega estoque/cargo conforme a configuração existente.

Este fluxo consulta o status diretamente na API Efí e não depende do webhook de entrada mTLS da Efí. O host ainda precisa manter o bot e o armazenamento configurado ativos para processamento contínuo.

## Antes de preencher as variáveis

- Uma conta Efí Pro para empreendedor sem CNPJ ou uma conta Efí Empresas.
- Criar uma aplicação da API Pix na conta Efí e habilitar os escopos `cob.write` e `cob.read` para o ambiente usado.
- Baixar o certificado P12/PFX do mesmo ambiente da aplicação. A Efí não disponibiliza novamente o mesmo certificado depois da emissão: mantenha um backup seguro.
- Para testes, usar credenciais e certificado de **Homologação**. Só selecionar `production` após validar o fluxo.

## Variáveis no host do bot

Configure no painel de variáveis/secrets do host — não no Discord, GitHub, mensagens ou arquivo versionado:

- `EFI_CLIENT_ID`
- `EFI_CLIENT_SECRET`
- `EFI_PIX_KEY` (chave Pix cadastrada na conta Efí)
- `EFI_CERT_P12_BASE64` (conteúdo Base64 do certificado `.p12`/`.pfx`)
- `EFI_CERT_P12_PASSWORD` (somente se o certificado tiver senha)

Em um computador com Node.js, converta o certificado para uma linha Base64 para guardar como secret:

```sh
node -e "process.stdout.write(require('fs').readFileSync('certificado.p12').toString('base64'))"
```

Alternativas se o host oferece armazenamento de arquivos secretos:

- P12: `EFI_CERT_P12_PATH`
- Certificado PEM + chave PEM: `EFI_CERT_PATH` e `EFI_KEY_PATH`
- Ou os mesmos conteúdos em Base64: `EFI_CERT_BASE64` e `EFI_KEY_BASE64`

Não compartilhe nem publique esses valores. Se um secret tiver sido exposto, revogue/regenere-o na Efí.

## Selecionar no painel do Discord

1. Reinicie/reimplante o bot para carregar os secrets.
2. Abra `/botconfig` → **Definições** → **Formas de pagamento** e selecione **Efí Bank · Sandbox/Teste**.
3. Faça uma compra de teste com a homologação; confirme que o QR e o Pix Copia e Cola aparecem e que a entrega só acontece após a API retornar o pagamento concluído.
4. Depois de concluir a configuração/validação da Efí, substitua no host as credenciais e o certificado pelos de produção e selecione **Efí Bank · Produção** no mesmo painel. O bot pedirá uma confirmação explícita porque novas cobranças serão reais.

O ambiente é salvo pelo painel no armazenamento persistente do bot. A variável `EFI_MODE` não é lida pelo código. Não misture credenciais ou certificados de homologação e produção.

A opção **Como configurar Efí** no painel de pagamentos do Discord mostra os nomes das variáveis, mas nunca armazena o client secret nem o certificado.

## Limite do ambiente de sandbox Efí

A documentação da Efí informa que, na homologação, cobranças de R$ 0,01 a R$ 10,00 são simuladas como pagas; valores acima de R$ 10,00 permanecem ativos, sem callback de pagamento. Faça o teste dentro desses limites.

## Referências oficiais

- [Credenciais, certificado e OAuth2](https://dev.efipay.com.br/docs/api-pix/credenciais)
- [Cobranças imediatas e consulta por txid](https://dev.efipay.com.br/docs/api-pix/cobrancas-imediatas)
- [Webhooks e requisito mTLS de entrada](https://dev.efipay.com.br/docs/api-pix/webhooks)
- [Efí Pro sem CNPJ](https://dev.efipay.com.br/docs/api-pix/credenciais)
