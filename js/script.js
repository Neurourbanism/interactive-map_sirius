/* ===== главные переменные ===== */
const layers = ['genplan','transport'];
const cats   = ['buildings','landscape'];

/* ===== карта и подложки ===== */
const bounds = L.latLngBounds([55.7407158302922,37.60009626314388],
                              [55.74309207410261,37.604669304174124]);

const map = L.map('map').fitBounds(bounds,{padding:[60,60]});
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
  {maxZoom:19, attribution:'© OSM, Carto'}).addTo(map);

const raster = {
  genplan  : L.imageOverlay('images/plan_georeferenced_finalSmall.webp',  bounds,{opacity:.8}),
  transport: L.imageOverlay('images/plan_georeferenced_blackSmall.webp', bounds,{opacity:.7})
};
raster.genplan.addTo(map);
let activeLayer = 'genplan';

/* ===== категории-контейнеры ===== */
const combo={};
layers.forEach(l=>{
  combo[l]={};
  cats.forEach(c=>combo[l][c]=L.layerGroup());
});

/* ===== иконки ===== */
const icons={
  buildings : L.icon({iconUrl:'icons/marker-orange.png',
                      shadowUrl:'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
                      iconSize:[25,41],iconAnchor:[12,41],shadowSize:[41,41]}),
  landscape : L.icon({iconUrl:'icons/marker-violet.png',
                      shadowUrl:'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
                      iconSize:[25,41],iconAnchor:[12,41],shadowSize:[41,41]})
};

/* ===== данные ===== */
fetch('data/points.geojson')
 .then(r=>r.json())
 .then(json=>{
   L.geoJSON(json,{
     pointToLayer:(f,ll)=>{
       const cat=(f.properties.cat||'buildings').toLowerCase();
       return L.marker(ll,{icon:icons[cat]||icons.buildings});
     },
     onEachFeature:(f,lyr)=>{
       const p=f.properties||{};
       lyr.bindPopup(
         `${p.img?`<img class="popup-img" src="${p.img}" style="cursor:zoom-in"><br>`:''}
          <div class="popup-title">${p.name||''}</div>
          ${p.descr?`<div class="popup-text">${p.descr}</div>`:''}`);
       const lay=(p.layer||'genplan').toLowerCase();
       const cat=(p.cat  ||'buildings').toLowerCase();
       combo[lay][cat].addLayer(lyr);
     }
   });

   /* --- контрол подложек --- */
   L.control.layers({'Генплан':raster.genplan,'Транспорт':raster.transport},null,
                    {collapsed:false}).addTo(map);

   /* --- контрол категорий --- */
   const catCtl=L.control.layers(null,{
      '<span class="legend-icon orange"></span> Здания'      : L.layerGroup(),
      '<span class="legend-icon violet"></span> Благоустр.'  : L.layerGroup()
   },{collapsed:false}).addTo(map);

   /* старт: обе категории на генплане */
   cats.forEach(c=>map.addLayer(combo.genplan[c]));

   /* смена подложки */
   map.on('baselayerchange',e=>{
     cats.forEach(c=>map.removeLayer(combo[activeLayer][c]));
     activeLayer=(e.name==='Транспорт')?'transport':'genplan';
     Object.values(catCtl._layers).forEach(o=>{
       const c=o.name.includes('Здания')?'buildings':'landscape';
       if(map.hasLayer(o.layer)) map.addLayer(combo[activeLayer][c]);
     });
   });

   /* категории on/off */
   catCtrl.on('overlayadd',  e=>{
  const cat = e.name.includes('Здания') ? 'buildings' : 'landscape';
  map.addLayer(combo[activeLayer][cat]);
});
catCtrl.on('overlayremove', e=>{
  const cat = e.name.includes('Здания') ? 'buildings' : 'landscape';
  map.removeLayer(combo[activeLayer][cat]);
});
});

/* ===== легенда CSS уже в style.css ===== */

