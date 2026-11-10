// Telefone BR: o backend guarda só dígitos (DDD + número). Aqui só máscara
// pra exibir/digitar: (11) 99999-9999 ou (11) 3333-4444.
export function formatPhone(value) {
  const d = String(value ?? '').replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : '';
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}
