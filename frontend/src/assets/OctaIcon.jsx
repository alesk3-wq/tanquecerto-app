// Ícone oficial da marca Octa — arquivo real fornecido pelo usuário
// (octa-icon.png, fundo transparente), não mais recriado à mão.
import octaIconSrc from './octa-icon.png';

// Imagem original não é quadrada (526×587) — controla só a altura e deixa
// a largura seguir a proporção real, pra não esticar/distorcer o ícone.
export default function OctaIcon({ size = 32, className = '', title }) {
  return (
    <img
      src={octaIconSrc}
      alt={title ?? ''}
      aria-hidden={title ? undefined : true}
      height={size}
      className={className}
    />
  );
}
