// Vocabulário fechado de sintomas de combustível — espelha o ENUM
// report_tags.tag do backend. Substitui o antigo campo de texto livre
// (removido por risco de acusação infundada sem embasamento).
export const REPORT_TAG_LABELS = {
  engasgo:          'Carro engasgou ou perdeu potência',
  cheiro_cor:        'Cheiro ou cor diferente do normal',
  consumo_pior:      'Consumo piorou depois de abastecer aqui',
  luz_acesa:         'Luz de injeção/motor acendeu depois',
  bomba_suspeita:    'Bomba com medidor suspeito (não bateu com o valor)',
  motor_irregular:   'Motor funcionou irregular (bateu pino, sacudiu)',
  preco_divergente:  'Preço na bomba diferente do informado/combinado',
};

export const REPORT_TAG_ORDER = Object.keys(REPORT_TAG_LABELS);
