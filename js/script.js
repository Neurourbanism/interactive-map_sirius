/* =======================================
   Leaflet-карта + слои + всплывашки
   ======================================= */

/* ---------- контрольные точки (границы PNG) ---------- */
const A = L.latLng(55.74309207410261, 37.60094412479446);
const B = L.latLng(55.74159932245304, 37.604669304174124);
const C = L.latLng(55.742289854123555, 37.60009626314388);
const D = L.latLng(55.7407158302922, 37.60376732369479);

const planBounds = L.latLngBounds(
  [Math.min(A.lat, B.lat, C.lat, D.lat), Math.min(A.lng, B.lng, C.lng, D.lng)],
  [Math.max(A.lat, B.lat, C.lat, D.lat), Math.max(A.lng, B.lng, C.lng, D.lng)]
);

/* ---------- карта ---------- */
const map = L.map('map');
map.fitBounds(planBounds, { padding: [60, 60] });

L.tileLayer(
  'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
  { maxZoom: 19, attribution: '© OSM, Carto' }
).addTo(map);

/* ---------- контейнеры слоёв ---------- */
const layers = {
  genplan  : L.layerGroup(),
  transport: L.layerGroup()
};

/* ---------- изображения-оверлеи ---------- */
L.imageOverlay('images/plan_georeferenced_final.png',      planBounds, { opacity: .8 })
 .addTo(layers.genplan);

L.imageOverlay('images/plan_georeferenced_finalBlack.png', planBounds, { opacity: .7 })
 .addTo(layers.transport);

/* ---------- иконка ---------- */
const blueIcon = L.icon({
  iconUrl  : 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
});

/* ---------- GeoJSON с точками ---------- */
fetch('data/points.geojson')
  .then(r => r.json())
  .then(json => {
    L.geoJSON(json, {
      pointToLayer : (_, latlng) => L.marker(latlng, { icon: blueIcon }),

      onEachFeature: (feat, lyr) => {
        const p = feat.properties || {};

        /* --- формируем раскрывашку ТЭП (если есть данные) --- */
        let tepBlock = '';
        if (p.total_area || p.living_area) {
          tepBlock =
            `<details class="popup-tep">
               <summary>ТЭП</summary>
               <ul>
                 ${p.total_area  ? `<li>Общая площадь — ${p.total_area.toLocaleString('ru-RU')} м²</li>` : ''}
                 ${p.living_area ? `<li>Жилая площадь — ${p.living_area.toLocaleString('ru-RU')} м²</li>` : ''}
               </ul>
             </details>`;
        }

        /* --- контент pop-up --- */
        lyr.bindPopup(
          `${p.img ? `<img class="popup-img" src="${p.img}" style="cursor:zoom-in"><br>` : ''}
           <div class="popup-title">${p.name || ''}</div>
           ${p.descr ? `<div class="popup-text">${p.descr}</div>` : ''}
           ${tepBlock}`
        );

        /* --- распределяем маркер по группам --- */
        const type = (p.layer || 'genplan').trim().toLowerCase();
        (layers[type] || layers.genplan).addLayer(lyr);
      }
    });
  });

/* ---------- чек-боксы ---------- */
L.control.layers(
  null,
  { 'Генплан': layers.genplan, 'Транспорт': layers.transport },
  { collapsed: false }
).addTo(map);

layers.genplan.addTo(map);                 // по умолчанию только генплан

/* =======================================================
   Лайтбокс — увеличиваем фото по клику
   ======================================================= */
function showLightbox(src) {
  const wrap = document.createElement('div');
  wrap.className = 'lb-overlay';
  wrap.innerHTML = `
      <button class="lb-close">×</button>
      <img src="${src}" alt="">
  `;
  document.body.appendChild(wrap);

  const close = () => wrap.remove();
  wrap.querySelector('.lb-close').onclick = close;
  wrap.onclick = e => { if (e.target === wrap) close(); };
}

/* — ставим обработчик при открытии pop-up — */
map.on('popupopen', e => {
  const img = e.popup._contentNode.querySelector('.popup-img');
  if (img) img.addEventListener('click', () => showLightbox(img.src), { once: true });
});
