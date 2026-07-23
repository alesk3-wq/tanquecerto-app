// Validação de dígito verificador de CPF — mesma lógica em frontend/src/utils/cpf.js
// (sem mecanismo de código compartilhado entre os dois lados neste projeto,
// mesmo padrão já usado em REFUEL_CHECK_RADIUS_KM). Aqui é a autoridade real
// (validação client-side é só feedback, não confiamos nela sozinha).
//
// Sequências de dígito repetido (111.111.111-11 etc.) passam no cálculo do
// dígito verificador normalmente — confirmado por cálculo manual, não é
// rejeitado sozinho — por isso a guarda explícita abaixo.
function isValidCPF(cpf) {
  if (typeof cpf !== 'string') return false;
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(digits)) return false;

  const calcCheckDigit = (base) => {
    let sum = 0;
    let weight = base.length + 1;
    for (const ch of base) sum += Number(ch) * weight--;
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };

  const base9 = digits.slice(0, 9);
  const d1 = calcCheckDigit(base9);
  const d2 = calcCheckDigit(base9 + String(d1));
  return digits === base9 + String(d1) + String(d2);
}

module.exports = { isValidCPF };
