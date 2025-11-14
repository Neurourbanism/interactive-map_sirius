/* =======================================
   Leaflet карта + категории маркеров
   ======================================= */

/* ---------- контрольные точки ---------- */
const A = L.latLng(55.74309207410261, 37.60094412479446);
const B = L.latLng(55.74159932245304, 37.604669304174124);
const C = L.latLng(55.742289854123555, 37.60009626314388);
const D = L.latLng(55.7407158302922, 37.60376732369479);

const planBounds = L.latLngBounds(
  [Math.min(A.lat,B.lat,C.lat,D.lat), Math.min(A.lng,B.lng,C.lng,D.lng)],
  [Math.max(A.lat,B.lat,C.lat,D.lat), Math.max(A.lng,B.lng,C.lng,D.lng)]
);

/* ---------- карта ---------- */
const map = L.map('map');
map.fitBounds(planBounds,{padding:[60,60]});

L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
  {maxZoom:19, attribution:'© OSM, Carto'}).addTo(map);

/* ---------- контейнеры слоёв ---------- */
const layers = { genplan:L.layerGroup(), transport:L.layerGroup() };

/* ---------- генплан сразу ---------- */
L.imageOverlay('images/plan_georeferenced_finalSmall.webp', planBounds,{opacity:.8})
 .addTo(layers.genplan);

/* ---------- транспорт лениво ---------- */
let transportLoaded = false;
map.on('overlayadd', e=>{
  if(e.name==='Транспорт' && !transportLoaded){
    L.imageOverlay('images/plan_georeferenced_blackSmall.webp', planBounds,{opacity:.7})
     .addTo(layers.transport);
    transportLoaded = true;
  }
});

/* ---------- иконки по категориям ---------- */
const icons = {
  buildings : L.icon({
     iconUrl :'https://cdn.jsdelivr.net/npm/leaflet-color-markers@1.1/img/marker-icon-orange.png',
     shadowUrl:'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
     iconSize:[25,41], iconAnchor:[12,41], shadowSize:[41,41]
  }),
  landscape : L.icon({
     iconUrl :'https://cdn.jsdelivr.net/npm/leaflet-color-markers@1.1/img/marker-icon-violet.png',
     shadowUrl:'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
     iconSize:[25,41], iconAnchor:[12,41], shadowSize:[41,41]
  })
};

/* ---------- контейнеры категорий ---------- */
const catLayers = {
  buildings : L.layerGroup(),
  landscape : L.layerGroup()
};

/* ---------- точки ---------- */
fetch('data/points.geojson')
  .then(r=>r.json())
  .then(json=>{
    L.geoJSON(json,{
      pointToLayer: (f,latlng)=>{
        const cat = (f.properties.cat || 'buildings').toLowerCase();
        return L.marker(latlng,{icon: icons[cat] || icons.buildings});
      },
      onEachFeature:(f,lyr)=>{
        const p = f.properties || {};

        lyr.bindPopup(
          `${p.img ? `<img class="popup-img" src="${p.img}" style="cursor:zoom-in"><br>` : ''}
           <div class="popup-title">${p.name || ''}</div>
           ${p.descr ? `<div class="popup-text">${p.descr}</div>` : ''}`
        );

        const lay = (p.layer || 'genplan').trim().toLowerCase();
        (layers[lay] || layers.genplan).addLayer(lyr);

        const cat = (p.cat || 'buildings').toLowerCase();
        (catLayers[cat] || catLayers.buildings).addLayer(lyr);
      }
    });
  });

/* ---------- чек-боксы ---------- */
L.control.layers(
  null,
  {
    'Генплан'           : layers.genplan,
    'Транспорт'         : layers.transport,
    'Здания (оранж.)'   : catLayers.buildings,
    'Благоустр. (фиол.)': catLayers.landscape
  },
  {collapsed:false}
).addTo(map);

layers.genplan.addTo(map);
catLayers.buildings.addTo(map);
catLayers.landscape.addTo(map);

/* ---------- Лайтбокс ---------- */
function showLightbox(src){
  if(document.querySelector('.lb-overlay')) return;
  const w = document.createElement('div');
  w.className = 'lb-overlay';
  w.innerHTML = `<button class="lb-close">×</button><img src="${src}" alt="">`;
  document.body.appendChild(w);
  const close = () => w.remove();
  w.querySelector('.lb-close').onclick = close;
w.onclick = e => { if(e.target===w) close(); };
}

map.on('popupopen', e=>{
  const img = e.popup._contentNode.querySelector('.popup-img');
  if(img) img.addEventListener('click',()=>showLightbox(img.src));
});
