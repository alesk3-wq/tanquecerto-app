import { useCallback } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';

// Amarra um card flutuante (BottomSheet) a um parâmetro da URL (?item=...).
// Abrir empilha uma entrada no histórico, então o botão voltar do Android
// (e do navegador) fecha o card em vez de sair da tela — essencial no TWA.
export default function useSheet(param = 'item') {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const value = params.get(param);

  const open = useCallback((v) => {
    const p = new URLSearchParams(location.search);
    p.set(param, v);
    navigate({ search: p.toString() }, { state: { sheetPushed: true } });
  }, [location.search, navigate, param]);

  const close = useCallback(() => {
    // Se fomos nós que empilhamos, volta (some com a entrada do histórico);
    // se a URL já veio com ?item= (link/recarregar), só remove o parâmetro.
    if (location.state?.sheetPushed) {
      navigate(-1);
    } else {
      const p = new URLSearchParams(location.search);
      p.delete(param);
      navigate({ search: p.toString() }, { replace: true });
    }
  }, [location.search, location.state, navigate, param]);

  return [value, open, close];
}
