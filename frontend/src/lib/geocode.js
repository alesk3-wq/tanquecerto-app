// Reverse geocoding via Nominatim (OpenStreetMap) — gratuito, sem API key.
// Nunca lança: qualquer falha (rede, timeout, resposta vazia) retorna null,
// deixando quem chamou tratar como "não deu, o usuário digita manualmente".

let lastCall = 0;

export async function reverseGeocode(lat, lng) {
  const wait = 1000 - (Date.now() - lastCall);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastCall = Date.now();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&addressdetails=0&accept-language=pt-BR`;
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.display_name ?? null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
