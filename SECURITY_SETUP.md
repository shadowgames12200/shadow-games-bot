# Suíte de segurança Shadow Games

A suíte foi adicionada de forma isolada dos módulos de vendas, pagamentos, carrinhos, estoque e tickets.

## Recursos incluídos

- Verificação por botão com entrega automática do cargo `Membro`.
- Remoção opcional do cargo de quarentena após a verificação.
- Proteção do canal reservado: mensagens de membros comuns são apagadas e o autor é expulso.
- Bloqueio opcional de bots que entrarem no servidor.
- Detecção de entrada em massa (anti-raid), com registro em logs.
- Anti-spam com timeout automático de um minuto.
- Logs de segurança em canal configurável.

## Configuração no servidor

1. Crie ou confirme o cargo `Membro`.
2. Crie, se desejar, um cargo `Quarentena`.
3. Deixe o cargo do bot acima de `Membro` e `Quarentena` na hierarquia de cargos.
4. Dê ao bot `Gerenciar cargos`, `Expulsar membros`, `Moderar membros`, `Gerenciar mensagens` e `Ver canais`.
5. No canal `✅・verificação`, execute `/seguranca painel`.
6. Execute `/seguranca configurar` selecionando `verificacao`, `membro`, `quarentena` (opcional), `raid`, `logs` e `bloquear_bots`.
7. Execute `/seguranca status` para conferir a configuração.

Exemplo conceitual:

```text
/seguranca painel
/seguranca configurar
  verificacao: ✅・verificação
  raid: 🚨・Convite
  logs: #logs-seguranca
  membro: @Membro
  quarentena: @Quarentena
  bloquear_bots: true
```

As categorias devem ter as permissões do Discord configuradas para que `@everyone` veja apenas o canal de verificação, enquanto `Membro` veja as categorias normais. A suíte não sobrescreve essas permissões automaticamente para evitar quebrar o sistema de vendas existente.

## Publicação

Copie `SecuritySuite.js`, `ComandosSlash/Administracao/seguranca.js` e a alteração de `index.js` para o repositório. Depois faça o deploy normalmente no Render. O comando slash será registrado no próximo reinício.
