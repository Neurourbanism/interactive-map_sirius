/*************
   Карта и подложки
*************/

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

/* imageOverlay-файлы */
const gen1 = L.layerGroup([
  L.imageOverlay('images/Masterplan1New.webp', b1,{opacity:.8})
]);
const trn1 = L.layerGroup([
  L.imageOverlay('images/Transport1New.webp',  b1,{opacity:.7})
]);
const gen2 = L.layerGroup([
  L.imageOverlay('images/Masterplan2.webp',    b2,{opacity:.8})
]);
const trn2 = L.layerGroup([
  L.imageOverlay('images/Transport2.webp',     b2,{opacity:.7})
]);

gen1.addTo(map);   // показываем генплан-1

/* чек-боксы подложек */
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

/*************
      Маркеры / категории
*************/

/* контейнеры категорий */
const combo = {
  buildings : L.layerGroup().addTo(map),
  landscape : L.layerGroup().addTo(map)
};

/* иконки */
const icons = {
  buildings : L.icon({
    iconUrl:'icons/marker-orange.png',
    shadowUrl:'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize:[25,41], iconAnchor:[12,41]
  }),
  landscape : L.icon({
    iconUrl:'icons/marker-violet.png',
    shadowUrl:'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize:[25,41], iconAnchor:[12,41]
  })
};

/* чек-боксы категорий */
const catCtrl = L.control.layers(
  null,
  {
    '<span class="legend-icon orange"></span> Здания'     : combo.buildings,
    '<span class="legend-icon violet"></span> Благоустр.' : combo.landscape
  },
  {collapsed:false, sanitize:false}
).addTo(map);

/* загрузка точек */
fetch('data/pointsObjects.geojson')
  .then(r=>r.json())
  .then(json=>{
    L.geoJSON(json,{
      pointToLayer:(f,ll)=>{
        let cat=(f.properties.cat||'buildings').toLowerCase();
        if(cat==='buldings') cat='buildings';       // исправляем опечатку
        return L.marker(ll,{icon:icons[cat]});
      },
      onEachFeature:(f,lyr)=>{
        const p=f.properties||{};
        lyr.bindPopup(`
          ${p.img ? `<img class="popup-img" src="${p.img}" style="cursor:zoom-in"><br>` : ''}
          <div class="popup-title">${p.name||''}</div>
          ${p.descr ? `<div class="popup-text">${p.descr}</div>` : ''}
        `);
        const cat=(p.cat||'buildings').toLowerCase();
        combo[cat].addLayer(lyr);
      }
    });
  });

/*************
         Лайтбокс
*************/
function showLightbox(src){
  if(document.querySelector('.lb-overlay')) return;
  const w=document.createElement('div');
  w.className='lb-overlay';
  w.innerHTML=`<button class="lb-close">×</button><img src="${src}" alt="">`;
  document.body.appendChild(w);
  w.querySelector('.lb-close').onclick=()=>w.remove();
  w.onclick=e=>{ if(e.target===w) w.remove(); };
}
map.on('popupopen', e=>{
  const img=e.popup._contentNode.querySelector('.popup-img');
  if(img) img.addEventListener('click',()=>showLightbox(img.src));
});

/*************
        Кнопки зума
*************/
const ZoomCtrl = L.Control.extend({
  onAdd(){
    const d=L.DomUtil.create('div','zoom-buttons');
    d.innerHTML =
      '<button id="toA">▣ Участок 1</button>' +
      '<button id="toB">▣ Участок 2</button>';
    return d;
  }
});
map.addControl(new ZoomCtrl({position:'topleft'}));
document.getElementById('toA').onclick = () => map.fitBounds(b1,{padding:[20,20]});
document.getElementById('toB').onclick = () => map.fitBounds(b2,{padding:[20,20]});
