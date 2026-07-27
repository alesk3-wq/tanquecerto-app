import { Link, useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import Step from '../components/Step';
import Icon from '../components/Icon';
import OctaIcon from '../assets/OctaIcon';

// Página de apresentação — o que um visitante não logado vê em "/".
// É o link que vai pras redes sociais, então precisa explicar o que é o app
// antes de jogar a pessoa no mapa. Não usa AuthLayout de propósito: aquele
// layout é uma coluna fixa de 400px, estreita demais pra isso.

const MOTIVOS = [
  {
    icon: 'confianca',
    title: 'Fuja de combustível ruim',
    desc: 'Veja o que outros motoristas relataram sobre a qualidade do combustível antes de abastecer.',
  },
  {
    icon: 'grafico',
    title: 'Saiba seu consumo real',
    desc: 'Registre os abastecimentos e acompanhe quantos km/l seu carro faz de verdade, por posto.',
  },
  {
    icon: 'pessoas',
    title: 'Avaliação de quem abastece',
    desc: 'Só quem registrou abastecimento no posto pode avaliar — nada de avaliação de quem nunca foi lá.',
  },
];

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-dvh bg-navy-950 text-slate-200 overflow-y-auto">
      <div className="max-w-2xl mx-auto px-5 py-10 pb-16">

        {/* Topo */}
        <header className="text-center">
          <div
            aria-hidden="true"
            className="w-20 h-20 rounded-[22px] bg-accent/12 border-[1.5px] border-accent/35 shadow-[0_0_40px_rgba(255,122,0,0.18)] flex items-center justify-center mx-auto mb-5"
          >
            <OctaIcon size={40} />
          </div>
          <h1
            className="text-accent text-4xl font-bold tracking-tight"
            style={{ fontFamily: 'Poppins' }}
          >
            Octa
          </h1>
          <p className="text-slate-400 text-base mt-2">O Waze dos postos de combustível</p>
          <p className="text-slate-500 text-sm mt-4 leading-relaxed max-w-md mx-auto">
            Uma comunidade de motoristas dizendo, na prática, em quais postos dá
            pra confiar — e ajudando você a saber quanto seu carro realmente faz
            por litro.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 mt-7 max-w-sm mx-auto">
            <Button onClick={() => navigate('/register')}>Criar conta grátis</Button>
            <Button variant="secondary" onClick={() => navigate('/mapa')}>
              Ver o mapa
            </Button>
          </div>
          <p className="text-slate-600 text-xs mt-3">
            Já tem conta?{' '}
            <Link to="/login" className="text-accent font-semibold hover:underline">Entrar</Link>
          </p>
        </header>

        {/* Por que usar */}
        <section className="mt-14">
          <h2 className="text-slate-200 font-semibold text-lg mb-4" style={{ fontFamily: 'Poppins' }}>
            Por que usar
          </h2>
          <div className="space-y-3">
            {MOTIVOS.map((m) => (
              <div
                key={m.icon}
                className="flex items-start gap-3.5 bg-navy-800 border border-navy-600 rounded-2xl p-4"
              >
                <div className="w-11 h-11 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center flex-shrink-0">
                  <Icon name={m.icon} size={22} />
                </div>
                <div>
                  <p className="font-semibold text-slate-100 text-[15px]">{m.title}</p>
                  <p className="text-sm text-slate-500 mt-1 leading-relaxed">{m.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Como funciona */}
        <section className="mt-12">
          <h2 className="text-slate-200 font-semibold text-lg mb-4" style={{ fontFamily: 'Poppins' }}>
            Como funciona
          </h2>
          <div className="space-y-3">
            <Step
              n={1}
              title="Abasteceu? Registra no app"
              desc="Leva alguns segundos: litros, valor e o KM do carro. O app confirma pelo GPS que você está mesmo no posto."
            />
            <Step
              n={2}
              title="Rodou com o combustível? Avalia"
              desc="A avaliação do combustível fica pro próximo abastecimento — só dá pra sentir a qualidade depois de rodar com ele."
            />
            <Step
              n={3}
              title="Veja a reputação e seu consumo"
              desc="Com as avaliações da comunidade, os postos ganham reputação. E você acompanha o km/l real de cada carro seu."
            />
          </div>
          <p className="text-xs text-slate-600 mt-4 leading-relaxed">
            Os 38 mil postos registrados na ANP já estão no mapa. A reputação de
            cada um aparece conforme os motoristas vão avaliando — quanto mais
            gente usando, mais confiável fica.
          </p>
        </section>

        {/* Rodapé */}
        <footer className="mt-12 pt-6 border-t border-navy-600 text-center">
          <Link
            to="/instalar"
            className="text-sm text-accent font-semibold hover:underline inline-block"
          >
            📲 Instalar o app no celular
          </Link>
          <p className="text-slate-700 text-xs mt-4">octa.eco.br</p>
        </footer>

      </div>
    </div>
  );
}
