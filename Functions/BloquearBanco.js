async function BloquearBanco() {
  // O Asaas é o único provedor operacional; não existe consulta de banco pagador
  // nem reembolso automático legado neste fluxo.
  return null;
}

module.exports = { BloquearBanco };
