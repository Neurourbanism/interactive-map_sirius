/* ===== карта и подложки (EPSG:4326) ===== */
/* границы мастер-плана в градусах */
const bounds = L.latLngBounds(
  [43.4106095120386968, 39.95101101168743],   // [South , West]
  [43.4173891758608832, 39.96542148920572]    // [North , East]
);

/* карта (по умолчанию 4326) */
const map = L.map('map')
             .fitBounds(bounds, {padding:[60,60]});

L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
  { maxZoom:19, attribution:'© OSM, Carto' }).addTo(map);

/* растровые слои */
const raster = {
  genplan  : L.imageOverlay('images/Masterplan1New.webp', bounds,{opacity:.8}),
  transport: L.imageOverlay('images/Transport1New.webp',  bounds,{opacity:.7})
};
raster.genplan.addTo(map);          // стартовая подложка
let activeLayer = 'genplan';

/* контрол «Слои» */
L.control.layers(
  { 'Генплан'  : raster.genplan,
    'Транспорт': raster.transport },
  null,
  { collapsed:false }
).addTo(map);


/* --- кастомные кнопки масштабирования --- */
const ZoomCtrl = L.Control.extend({
  onAdd(){
    const d = L.DomUtil.create('div','zoom-buttons');
    d.innerHTML =
      '<button id="toA">▣ Участок 1</button>' +
      '<button id="toB">▣ Участок 2</button>' +
      '<button id="toBoth">▣ Оба</button>';
    return d;
  }
});
map.addControl(new ZoomCtrl({position:'topleft'}));

document.getElementById('toA').onclick   = ()=> map.fitBounds(b1,{padding:[20,20]});
document.getElementById('toB').onclick   = ()=> map.fitBounds(b2,{padding:[20,20]});
document.getElementById('toBoth').onclick= ()=> map.fitBounds(fullBounds,{padding:[60,60]});

/* ===== категории-контейнеры ===== */
const combo = {};
layers.forEach(l=>{
  combo[l]={};
  cats.forEach(c=> combo[l][c] = L.layerGroup());
});

/* ===== иконки ===== */
const icons = {
  buildings : L.icon({
    iconUrl:'icons/marker-orange.png',
    shadowUrl:'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize:[25,41], iconAnchor:[12,41], shadowSize:[41,41]
  }),
  landscape : L.icon({
    iconUrl:'icons/marker-violet.png',
    shadowUrl:'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize:[25,41], iconAnchor:[12,41], shadowSize:[41,41]
  })
};

/* ===== данные ===== */
fetch('data/points.geojson')
  .then(r => r.json())
  .then(json => {

    /* --- раскладываем маркеры --- */
    L.geoJSON(json, {
      pointToLayer: (f, ll) => {
        const cat = (f.properties.cat || 'buildings').toLowerCase();
        return L.marker(ll, { icon: icons[cat] || icons.buildings });
      },
      onEachFeature: (f, lyr) => {
        const p = f.properties || {};
      lyr.bindPopup(
  `${p.img ? `<img class="popup-img" src="${p.img}" style="cursor:zoom-in"><br>` : ''}
   <div class="popup-title">${p.name || ''}</div>
   ${p.descr ? `<div class="popup-text">${p.descr}</div>` : ''}`
); 
        const lay = (p.layer || 'genplan').toLowerCase();
        const cat = (p.cat   || 'buildings').toLowerCase();
        combo[lay][cat].addLayer(lyr);
      }
    });

      /* ---------- контрол «Категории» ---------- */
    const catCtrl = L.control.layers(
      null,
      {
        '<span class="legend-icon orange"></span> Здания'      : L.layerGroup(),
        '<span class="legend-icon violet"></span> Благоустр.'  : L.layerGroup()
      },
      { collapsed:false, sanitize:false }
    ).addTo(map);

    // проставляем галочки визуально
    Object.values(catCtrl._layers).forEach(o => map.addLayer(o.layer));

    /* ---------- отображаем стартовый набор ---------- */
    cats.forEach(c => map.addLayer(combo.genplan[c]));

    /* ---------- реакция на смену подложки ---------- */
    map.on('baselayerchange', e=>{
      cats.forEach(c => map.removeLayer(combo[activeLayer][c]));
      activeLayer = (e.name === 'Транспорт') ? 'transport' : 'genplan';

      Object.values(catCtrl._layers).forEach(o=>{
        const c = o.name.includes('Здания') ? 'buildings' : 'landscape';
        if(map.hasLayer(o.layer)) map.addLayer(combo[activeLayer][c]);
      });
    });

    /* ---------- реакция на категории ---------- */
    map.on('overlayadd',   e=>{
      const c = e.name.includes('Здания') ? 'buildings' : 'landscape';
      map.addLayer(combo[activeLayer][c]);
    });
    map.on('overlayremove',e=>{
      const c = e.name.includes('Здания') ? 'buildings' : 'landscape';
      map.removeLayer(combo[activeLayer][c]);
    });
});   // ← ЭТО — закрывающая скобка fetch!

/* ========= лайтбокс ========= */
function showLightbox(src){
  if(document.querySelector('.lb-overlay')) return;
  const w=document.createElement('div');
  w.className='lb-overlay';
  w.innerHTML = `<button class="lb-close">×</button><img src="${src}" alt="">`;
  document.body.appendChild(w);
  w.querySelector('.lb-close').onclick=()=>w.remove();
  w.onclick=e=>{ if(e.target===w) w.remove(); };
}
map.on('popupopen', e=>{
  const img=e.popup._contentNode.querySelector('.popup-img');
  if(img) img.addEventListener('click',()=>showLightbox(img.src));
});
















