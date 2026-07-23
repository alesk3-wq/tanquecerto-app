// Validação de dígito verificador de CPF — mesma lógica em backend/src/utils/cpf.js
// (autoridade real). Aqui é só feedback imediato antes de enviar o formulário,
// não substitui a validação do servidor.
export function isValidCPF(cpf) {
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
