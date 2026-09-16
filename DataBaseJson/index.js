const { createDatabase } = require('../DatabasePostgres');

const produtos = createDatabase('produtos');
const carrinhos = createDatabase('carrinhos');
const pagamentos = createDatabase('pagamentos');
const pedidos = createDatabase('pedidos');
const estatisticas = createDatabase('estatisticas');
const avaliacoes = createDatabase('avaliacoes');
const configuracao = createDatabase('configuracao');
const tickets = createDatabase('tickets');

module.exports = { produtos, carrinhos, pagamentos, pedidos, configuracao, estatisticas, avaliacoes, tickets };
