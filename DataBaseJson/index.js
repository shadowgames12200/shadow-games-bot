const {
  JsonDatabase,
} = require("wio.db");

const produtos = new JsonDatabase({
  databasePath: "./DataBaseJson/produtos.json"
});


const carrinhos = new JsonDatabase({
  databasePath: "./DataBaseJson/carrinhos.json"
});

const pagamentos = new JsonDatabase({
  databasePath: "./DataBaseJson/pagamentos.json"
});

const pedidos = new JsonDatabase({
  databasePath: "./DataBaseJson/pedidos.json"
});

const estatisticas = new JsonDatabase({
  databasePath: "./DataBaseJson/estatisticas.json"
});

const avaliacoes = new JsonDatabase({
  databasePath: "./DataBaseJson/avaliacoes.json"
});

const configuracao = new JsonDatabase({
  databasePath: "./DataBaseJson/configuracao.json"
});

const tickets = new JsonDatabase({
  databasePath: "./DataBaseJson/tickets.json"
});











module.exports = {
  produtos,
  carrinhos,
  pagamentos,
  pedidos,
  configuracao,
  estatisticas,
  avaliacoes,
  tickets
}
