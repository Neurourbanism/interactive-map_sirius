/* ===== карта и подложки (EPSG:4326) ===== */

/* bounds участка-1 */
const b1 = L.latLngBounds(
  [43.4106095120386968, 39.95101101168743],
  [43.4173891758608832, 39.96542148920572]
);
/* bounds участка-2 */
const b2 = L.latLngBounds(
  [43.395917235035576 , 39.98298856123352],
  [43.404276445202839 , 39.99223406925298]
);

const map = L.map('map').fitBounds(b1,{padding:[40,40]});
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
  {maxZoom:19, attribution:'© OSM, Carto'}).addTo(map);

/* === служебные массивы === */
const layers = ['genplan','transport'];      // растровые слои
const cats   = ['buildings','landscape'];    // категории
let   activeLayer = 'genplan';               // стартовая подложка

/* --- overlay-файлы --- */
const mp1 = L.imageOverlay('images/Masterplan1New.webp', b1,{opacity:.8});
const tr1 = L.imageOverlay('images/Transport1New.webp',  b1,{opacity:.7});
const mp2 = L.imageOverlay('images/Masterplan2.webp',    b2,{opacity:.8});
const tr2 = L.imageOverlay('images/Transport2.webp',     b2,{opacity:.7});

/* отдельные группы для чекбоксов */
const gen1 = L.layerGroup([mp1]),
      gen2 = L.layerGroup([mp2]),
      trn1 = L.layerGroup([tr1]),
      trn2 = L.layerGroup([tr2]);

/* показываем генплан-1 при загрузке */
gen1.addTo(map);

/* контрол «Слои / Участки» */
L.control.layers(
  null,
  {
    'Участок 1 — генплан'  : gen1,
    'Участок 1 — транспорт': trn1,
    'Участок 2 — генплан'  : gen2,
    'Участок 2 — транспорт': trn2
  },
  {collapsed:false}
).addTo(map);

/* ===== категории-контейнеры ===== */
const combo = {};
layers.forEach(l=>{
  combo[l] = {};
  cats.forEach(c => combo[l][c] = L.layerGroup());
});

/* ===== иконки ===== */
const icons = {
  buildings : L.icon({
    iconUrl   : 'icons/marker-orange.png',
    shadowUrl : 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize  : [25,41], iconAnchor:[12,41], shadowSize:[41,41]
  }),
  landscape : L.icon({
    iconUrl   : 'icons/marker-violet.png',
    shadowUrl : 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize  : [25,41], iconAnchor:[12,41], shadowSize:[41,41]
  })
};

/* ===== данные ===== */
fetch('data/pointsObjects.geojson')
  .then(r => r.json())
  .then(json => {

    /* --- добавляем маркеры --- */
    L.geoJSON(json,{
      pointToLayer:(f,ll)=>{
        const cat = (f.properties.cat || 'buildings').toLowerCase();
        return L.marker(ll,{icon:icons[cat] || icons.buildings});
      },
      onEachFeature:(f,lyr)=>{
        const p = f.properties || {};

        const popup = `
          ${p.img ? `<img class="popup-img" src="${p.img}" style="cursor:zoom-in"><br>` : ''}
          <div class="popup-title">${p.name || ''}</div>
          ${p.descr ? `<div class="popup-text">${p.descr}</div>` : ''}
        `;
        lyr.bindPopup(popup);

        const lay = (p.layer || 'genplan').toLowerCase();
        const cat = (p.cat   || 'buildings').toLowerCase();
        combo[lay][cat].addLayer(lyr);
      }
    });

    /* --- контрол «Категории» --- */
    const catCtrl = L.control.layers(
      null,
      {
        '<span class="legend-icon orange"></span> Здания'     : L.layerGroup(),
        '<span class="legend-icon violet"></span> Благоустр.' : L.layerGroup()
      },
      { collapsed:false, sanitize:false }
    ).addTo(map);

    /* включаем галочки визуально */
    Object.values(catCtrl._layers).forEach(o => map.addLayer(o.layer));

    /* стартовый набор маркеров */
    cats.forEach(c => map.addLayer(combo.genplan[c]));

    /* смена подложки */
    map.on('baselayerchange', e=>{
      cats.forEach(c => map.removeLayer(combo[activeLayer][c]));
      activeLayer = (e.name === 'Транспорт') ? 'transport' : 'genplan';
      Object.values(catCtrl._layers).forEach(o=>{
        const c = o.name.includes('Здания') ? 'buildings' : 'landscape';
        if(map.hasLayer(o.layer)) map.addLayer(combo[activeLayer][c]);
      });
    });

    /* категории on/off */
    map.on('overlayadd',   e=>{
      const c = e.name.includes('Здания') ? 'buildings' : 'landscape';
      map.addLayer(combo[activeLayer][c]);
    });
    map.on('overlayremove',e=>{
      const c = e.name.includes('Здания') ? 'buildings' : 'landscape';
      map.removeLayer(combo[activeLayer][c]);
    });
  });

/* ===== лайтбокс ===== */
function showLightbox(src){
  if(document.querySelector('.lb-overlay')) return;
  const w = document.createElement('div');
  w.className = 'lb-overlay';
  w.innerHTML = `<button class="lb-close">×</button><img src="${src}" alt="">`;
  document.body.appendChild(w);
  w.querySelector('.lb-close').onclick = () => w.remove();
  w.onclick = e => { if(e.target === w) w.remove(); };
}
map.on('popupopen', e=>{
  const img = e.popup._contentNode.querySelector('.popup-img');
  if(img) img.addEventListener('click', () => showLightbox(img.src));
});










