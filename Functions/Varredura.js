async function Varredura() {
  console.log('[Varredura] Rotina legada de Mercado Pago desativada; pagamentos operacionais usam Asaas.');
  return { disabled: true, provider: 'asaas' };
}

module.exports = { Varredura };
