// Ícones da marca Octa (kit de 10, arquivos reais em src/assets/icons/) —
// substituem o emoji solto usado antes em botões/badges/estados vazios.
import pin from '../assets/icons/pin.svg';
import busca from '../assets/icons/busca.svg';
import configuracoes from '../assets/icons/configuracoes.svg';
import estrela from '../assets/icons/estrela.svg';
import confianca from '../assets/icons/confianca.svg';
import combustivel from '../assets/icons/combustivel.svg';
import notificacoes from '../assets/icons/notificacoes.svg';
import coracao from '../assets/icons/coracao.svg';
import grafico from '../assets/icons/grafico.svg';
import pessoas from '../assets/icons/pessoas.svg';

const ICONS = {
  pin, busca, configuracoes, estrela, confianca,
  combustivel, notificacoes, coracao, grafico, pessoas,
};

// Cada arquivo tem uma proporção levemente diferente (exportado do Corel) —
// controla só a altura e deixa a largura seguir a proporção real, mesmo
// approach do OctaIcon, pra nunca esticar/distorcer.
export default function Icon({ name, size = 16, className = '', title }) {
  const src = ICONS[name];
  if (!src) return null;
  return (
    <img
      src={src}
      alt={title ?? ''}
      aria-hidden={title ? undefined : true}
      className={className}
      // O preflight do Tailwind reseta <img> pra max-width:100%/height:auto
      // (deixa a imagem esticar até a largura do container) — sem isso a
      // altura pedida em `size` é ignorada fora de uma caixa com largura
      // já limitada. maxWidth:none garante que só a altura controla o tamanho.
      style={{ display: 'inline-block', verticalAlign: 'middle', height: size, width: 'auto', maxWidth: 'none' }}
    />
  );
}
