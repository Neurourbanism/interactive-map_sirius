// -------- контрольные точки генплана -----------
const A = L.latLng(55.74309207410261, 37.60094412479446); // верх-левый
const B = L.latLng(55.74159932245304, 37.604669304174124); // верх-правый
const C = L.latLng(55.742289854123555, 37.60009626314388); // низ-левый
const D = L.latLng(55.7407158302922, 37.60376732369479); // низ-правый

// границы изображения: [[south, west], [north, east]]
const planBounds = L.latLngBounds(
  [Math.min(A.lat, B.lat, C.lat, D.lat), Math.min(A.lng, B.lng, C.lng, D.lng)],
  [Math.max(A.lat, B.lat, C.lat, D.lat), Math.max(A.lng, B.lng, C.lng, D.lng)]
);

const map = L.map('map');
map.fitBounds(planBounds, { padding: [60, 60] }); // 60px поля

// подложка
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
  maxZoom: 19,
  attribution: '© OSM, Carto'
}).addTo(map);

// Обычный (не повернутый) оверлей — используется, если PNG уже в WGS84
L.imageOverlay('images/plan_georeferenced_final.png', planBounds, { opacity: 0.8 }).addTo(map);

// -------- маркер-иконка ----------
const blueIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
});

// -------- точки из GeoJSON ----------
fetch('data/points.geojson')
  .then(r => r.json())
  .then(json => {
    L.geoJSON(json, {
      pointToLayer: (_, latlng) => L.marker(latlng, { icon: blueIcon }),
      onEachFeature: (f, layer) => {
        const p = f.properties || {};
        layer.bindPopup(
          `<b>${p.name || ''}</b><br>
           <img class="popup-img" src="${p.img || ''}"><br>
           ${p.descr || ''}`
        );
      }
    }).addTo(map);
  });

