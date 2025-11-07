// -------- контрольные точки генплана -----------
const A = L.latLng(55.743076, 37.600931); // верх-левый
const B = L.latLng(55.741647, 37.604783); // верх-правый
const C = L.latLng(55.742281, 37.600060); // низ-левый
const D = L.latLng(55.740682, 37.603843); // реальный низ-правый

const planBounds = L.latLngBounds([A, D]);

const map = L.map('map');
map.fitBounds(L.latLngBounds([A, D]), { padding: [60, 60] }); // 60px поля

// подложка
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 19,
    attribution: '© OSM, Carto'
}).addTo(map);

// повернутый оверлей с тенью и скруглением
L.imageOverlay.rotated('images/plan.jpg', A, B, C, {
    opacity: 0.8,
    className: 'overlay-shadow' // Добавляем класс для стилизации
}).addTo(map);

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
                const p = f.properties;
                layer.bindPopup(
                    `<b>${p.name}</b><br>
           <img class="popup-img" src="${p.img}"><br>
           ${p.descr}`
                );
            }
        }).addTo(map);
    });

