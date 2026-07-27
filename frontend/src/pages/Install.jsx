import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthLayout from '../layouts/AuthLayout';
import Button from '../components/Button';
import FullScreenPrompt from '../components/FullScreenPrompt';
import Step from '../components/Step';
import OctaIcon from '../assets/OctaIcon';

const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
const isAndroid = /Android/.test(navigator.userAgent);
const isStandalone = window.matchMedia('(display-mode: standalone)').matches
  || window.navigator.standalone === true;

export default function Install() {
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showAndroidSteps, setShowAndroidSteps] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    let timer;
    function onBeforeInstallPrompt(e) {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowAndroidSteps(false);
      clearTimeout(timer);
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);

    // Se o evento não disparar em 4s (ex: navegador sem suporte), mostra o passo a passo manual
    if (isAndroid && !isStandalone) {
      timer = setTimeout(() => setShowAndroidSteps(true), 4000);
    }
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      clearTimeout(timer);
    };
  }, []);

  async function handleInstallClick() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    if (outcome === 'accepted') {
      setInstalling(true);
      setTimeout(() => {
        window.close();
        setTimeout(() => navigate('/mapa'), 800);
      }, 3000);
    }
  }

  if (installing) {
    return <FullScreenPrompt icon={<OctaIcon size={40} />} title="Instalando o app..." spinner />;
  }

  return (
    <AuthLayout subtitle="Instale o app no seu celular" cardTitle="Instalar Octa">
      {isStandalone && (
        <div className="text-center py-2">
          <div className="w-14 h-14 rounded-full bg-rep-good/15 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl" aria-hidden="true">✅</span>
          </div>
          <p className="text-slate-200 font-semibold mb-1">App já instalado!</p>
          <p className="text-slate-500 text-sm mb-6">Você já está usando o Octa como aplicativo.</p>
          <Button onClick={() => navigate('/mapa')}>Ir para o mapa →</Button>
        </div>
      )}

      {!isStandalone && isAndroid && (
        <div className="space-y-3">
          {!showAndroidSteps ? (
            <Button onClick={handleInstallClick} disabled={!deferredPrompt}>
              {deferredPrompt ? (
                <span className="inline-flex items-center gap-1.5"><OctaIcon size={14} />Instalar aplicativo</span>
              ) : 'Preparando instalação...'}
            </Button>
          ) : (
            <>
              <p className="text-xs text-slate-500 mb-1">Instale manualmente pelo Chrome:</p>
              <Step n={1} title="Abra no Google Chrome" desc="Certifique-se de estar usando o Chrome para Android." />
              <Step n={2} title="Toque no menu ⋮" desc="No canto superior direito do navegador." />
              <Step n={3} title='Toque em "Adicionar à tela inicial"' desc="Confirme e o ícone aparecerá na sua tela." />
            </>
          )}
        </div>
      )}

      {!isStandalone && isIOS && (
        <div className="space-y-3">
          <Step n={1} title="Abra no Safari" desc="Esse recurso só funciona no Safari — não use Chrome ou outro navegador." />
          <Step n={2} title="Toque em Compartilhar" desc="O ícone de compartilhar fica na barra inferior do Safari." />
          <Step n={3} title='Toque em "Adicionar à Tela de Início"' desc="Role a lista de opções até encontrar e confirme." />
          <Step n={4} title="Pronto!" desc="O ícone do Octa aparecerá na sua tela de início." />
        </div>
      )}

      {!isStandalone && !isAndroid && !isIOS && (
        <div className="text-center py-2">
          <p className="text-4xl mb-3" aria-hidden="true">📱</p>
          <p className="text-slate-200 font-semibold mb-1">Acesse pelo celular</p>
          <p className="text-slate-500 text-sm mb-6">
            Para instalar o app, abra esta página no seu smartphone Android ou iPhone.
          </p>
          <Button variant="secondary" onClick={() => navigate('/mapa')}>Continuar no navegador</Button>
        </div>
      )}
    </AuthLayout>
  );
}
