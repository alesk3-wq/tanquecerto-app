// Compartilhado pelo popup do marcador (Home.jsx) e pelo botão "Rota" do
// StationCard — mesma rota do Google Maps nos dois lugares.
export function openRoute(userPos, station) {
  const url = `https://www.google.com/maps/dir/?api=1&origin=${userPos.lat},${userPos.lng}&destination=${station.latitude},${station.longitude}&travelmode=driving`;
  window.open(url, '_blank', 'noopener,noreferrer');
}
