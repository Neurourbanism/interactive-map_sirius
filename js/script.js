/* ======================================
   Leaflet + базовые слои + категории
   ====================================== */

const planBounds = L.latLngBounds(
  [55.7407158302922,37.60009626314388],
  [55.74309207410261,37.604669304174124]
);

const map = L.map('map').fitBounds(planBounds,{padding:[60,60]});
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
  {maxZoom:19, attribution:'© OSM, Carto'}).addTo(map);

/* ---------- базовые подложки ---------- */
const raster = {
  genplan  : L.imageOverlay('images/plan_georeferenced_finalSmall.webp',  planBounds,{opacity:.8}),
  transport: L.imageOverlay('images/plan_georeferenced_blackSmall.webp', planBounds,{opacity:.7})
};

/* ---------- иконки ---------- */
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

/* ---------- контейнеры layer×cat ---------- */
const cats   = ['buildings','landscape'];
const layers = ['genplan','transport'];
const combo  = {};                        // combo[layer][cat] = L.Group
layers.forEach(l=>{
  combo[l]={};
  cats.forEach(c=> combo[l][c]=L.layerGroup());
});

/* ---------- текущая активная подложка ---------- */
let activeLayer = 'genplan';
raster.genplan.addTo(map);                // стартуем с генплана

/* ---------- GeoJSON ---------- */
fetch('data/points.geojson')
  .then(r=>r.json())
  .then(json=>{
    L.geoJSON(json,{
      pointToLayer:(f,latlng)=>{
        const cat=(f.properties.cat||'buildings').toLowerCase();
        return L.marker(latlng,{icon:icons[cat]||icons.buildings});
      },
      onEachFeature:(f,lyr)=>{
  const p=f.properties||{};
  lyr.bindPopup(
    `${p.img?`<img class="popup-img" src="${p.img}" style="cursor:zoom-in"><br>`:''}
     <div class="popup-title">${p.name||''}</div>
     ${p.descr?`<div class="popup-text">${p.descr}</div>`:''}`
  );

 const lay = (p.layer || 'genplan').toLowerCase();
const cat = (p.cat   || 'buildings').toLowerCase();

  combo[lay][cat].addLayer(lyr);    // ← здесь теперь правильно
}
    });

    /* ---------- контрол подложек ---------- */
   L.control.layers(
  { 'Генплан': raster.genplan,
    'Транспорт': raster.transport },
  null,
  {collapsed:false}
).addTo(map);
    /* ---------- контрол категорий ---------- */
    const catCtrl = L.control.layers(null, {
  '<span class="legend-icon orange"></span> Здания'      : cat.buildings,
  '<span class="legend-icon violet"></span> Благоустр.'  : cat.landscape
},
{collapsed:false}).addTo(map);

    /* при старте включаем обе категории */
    cats.forEach(c=> map.addLayer(combo[activeLayer][c]));

    /* --- реакция на переключение слоя --- */
    map.on('baselayerchange', e=>{
      // снять маркеры старого слоя
      cats.forEach(c=> map.removeLayer(combo[activeLayer][c]));
      activeLayer = (e.name==='Транспорт') ? 'transport' : 'genplan';
      // добавить маркеры нового слоя, если чекбокс включён
      const proxyLayers = catCtrl._layers;
      cats.forEach(c=>{
        const key = c==='buildings' ? 'Здания' : 'Благоустр.';
        const proxy = Object.values(proxyLayers).find(o=>o.name.includes(key));
        if(proxy && map.hasLayer(proxy.layer)){           // чекбокс on
          map.addLayer(combo[activeLayer][c]);
        }
      });
    });

    /* --- реакция на категории --- */
    catCtrl.on('overlayadd',  e=>{
      const cat = e.name.includes('Здания') ? 'buildings' : 'landscape';
      map.addLayer(combo[activeLayer][cat]);
    });
    catCtrl.on('overlayremove', e=>{
      const cat = e.name.includes('Здания') ? 'buildings' : 'landscape';
      map.removeLayer(combo[activeLayer][cat]);
    });
});
/* ---------- лайтбокс ---------- */
function showLightbox(src){
  if(document.querySelector('.lb-overlay')) return;
  const w=document.createElement('div');
  w.className='lb-overlay';
  w.innerHTML=`<button class="lb-close">×</button><img src="${src}" alt="">`;
  document.body.appendChild(w);
  w.querySelector('.lb-close').onclick=()=>w.remove();
  w.onclick=e=>{if(e.target===w)w.remove();};
}
map.on('popupopen', e=>{
  const img=e.popup._contentNode.querySelector('.popup-img');
  if(img) img.addEventListener('click',()=>showLightbox(img.src));
});


