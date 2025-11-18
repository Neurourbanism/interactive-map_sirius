/*************
 * 0. служебные массивы
 *************/
const cats = ['buildings','landscape'];           // типы маркеров

/*************
 * 1. карта + эскизы
 *************/
const b1 = L.latLngBounds([43.4106095120387 ,39.95101101168743],
                          [43.41738917586088,39.96542148920572]);

const b2 = L.latLngBounds([43.3959172350356 ,39.98298856123352],
                          [43.40427644520284,39.99223406925298]);

const map = L.map('map').fitBounds(b1,{padding:[40,40]});
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
  {maxZoom:19, attribution:'© OSM, Carto'}).addTo(map);

const mp1 = L.imageOverlay('images/Masterplan1New.webp', b1,{opacity:.85});
const mp2 = L.imageOverlay('images/Masterplan2.webp'   , b2,{opacity:.85});
const genSketch = L.layerGroup([mp1,mp2]).addTo(map);      // видно при старте

/*************
 * 2. транспорт-слои (5 GeoJSON-файлов)
 *************/
const transportGroup = L.layerGroup();                     // пока НЕ addTo(map)

/* — вспомогательные подгрузчики — */
const loadLine = (url,color,width=2,extra={})=>{
  fetch(url).then(r=>r.json()).then(j=>{
    L.geoJSON(j,{ style:{color,weight:width,...extra} }).addTo(transportGroup);
  });
};
const loadPoint = (url,color,r=6)=>{
  fetch(url).then(r=>r.json()).then(j=>{
    L.geoJSON(j,{
      pointToLayer:(_,ll)=>L.circleMarker(ll,{
        radius:r, color:'000', weight:1,
        fillColor:color, fillOpacity:.85
      })
    }).addTo(transportGroup);
  });
};

/* — сами файлы — */
loadLine ( 'data/bike.geojson'     , '00a4ff', 2.5 );                 // вело
loadPoint( 'data/busstop.geojson'  , 'ff66cc', 5   );                 // остановки
loadPoint( 'data/entrance.geojson' , 'ff0000', 5   );                 // въезды
loadLine ( 'data/parking.geojson'  , '888888', 1 , {dashArray:'4 3'} );// парковки контур
loadPoint( 'data/railway2.geojson' , '8b4513', 6   );                 // ж/д

/*************
 * 3. чек-боксы подложек
 *************/
L.control.layers(
  null,
  { 'Эскиз'    : genSketch,
    'Транспорт': transportGroup },
  { collapsed:false }
).addTo(map);

/*************
 * 4. кнопки зума
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
map.addControl( new ZoomCtrl({position:'topleft'}) );
document.getElementById('toA').onclick = ()=>map.fitBounds(b1,{padding:[20,20]});
document.getElementById('toB').onclick = ()=>map.fitBounds(b2,{padding:[20,20]});

/*************
 * 5. категории-контейнеры
 *************/
const combo = {
  buildings : L.layerGroup(),
  landscape : L.layerGroup()
};
const icons = {
  buildings : L.icon({
    iconUrl :'icons/marker-orange.png',
    shadowUrl:'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize:[25,41],iconAnchor:[12,41],shadowSize:[41,41]
  }),
  landscape : L.icon({
    iconUrl :'icons/marker-violet.png',
    shadowUrl:'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize:[25,41],iconAnchor:[12,41],shadowSize:[41,41]
  })
};

/* контрол категорий */
L.control.layers(
  null,
  {
    '<span class="legend-icon orange"></span> Объекты'      : combo.buildings,
    '<span class="legend-icon violet"></span> Благоустрой.' : combo.landscape
  },
  {collapsed:false, sanitize:false}
).addTo(map);

/*************
 * 6. загрузка точек
 *************/
fetch('data/pointsObjects.geojson')
 .then(r=>r.json())
 .then(json=>{
   L.geoJSON(json,{
     pointToLayer:(f,ll)=>{let cat=(f.properties.cat||'buildings').toLowerCase();
       if(cat==='buldings') cat='buildings';          // опечатка
       return L.marker(ll,{icon:icons[cat]});
     },
     onEachFeature:(f,lyr)=>{
       const p=f.properties||{};

       /* картинки (до 3-х) */
       const imgs=[p.img,p.img2,p.img3].filter(Boolean)
         .map(src=>`<img class="popup-img" src="${src}" style="cursor:zoom-in">`)
         .join('<br>');

       /* описание */
       const descr = p.descr ? `<div class="popup-text">${p.descr}</div>` : '';

       /* ТЭП */
       const tep=[];
       if(p.buildarea)  tep.push(`Площадь застройки — ${Number(p.buildarea).toLocaleString('ru-RU')} м²`);
       if(p.grossarea)  tep.push(`Общая площадь — ${Number(p.grossarea).toLocaleString('ru-RU')} м²`);
       if(p.usefularea) tep.push(`Полезная площадь — ${Number(p.usefularea).toLocaleString('ru-RU')} м²`);
       if(p.roofarea)   tep.push(`Экспл. кровля — ${Number(p.roofarea).toLocaleString('ru-RU')} м²`);
       if(p.invest)     tep.push(`Инвестиции — ${p.invest} млрд ₽`);
       if(p.implement)  tep.push(`Механизм реализации — ${p.implement}`);
       if(p.period)     tep.push(`Период строительства — ${p.period}`);

       const tepBlock = tep.length
         ? `<details class="popup-tep"><summary>ТЭП</summary><ul><li>${tep.join('</li><li>')}</li></ul></details>`
         : '';

       lyr.bindPopup(`${imgs}<div class="popup-title">${p.name||''}</div>${descr}${tepBlock}`);

       const cat=(p.cat||'buildings').toLowerCase();
       combo[cat].addLayer(lyr);
     }
   });

   /* категории включены по умолчанию */
   map.addLayer(combo.buildings);
   map.addLayer(combo.landscape);
 });

/*************
 * 7. Лайтбокс
 *************/
function showLightbox(src){
  if(document.querySelector('.lb-overlay')) return;
  const w=document.createElement('div');
  w.className='lb-overlay';
  w.innerHTML=`<button class="lb-close">×</button><img src="${src}" alt="">`;
  document.body.appendChild(w);
  w.querySelector('.lb-close').onclick=()=>w.remove();
  w.onclick = e=>{ if(e.target===w) w.remove(); };
}
map.on('popupopen', e=>{
  e.popup._contentNode.querySelectorAll('.popup-img')
   .forEach(img=>img.addEventListener('click',()=>showLightbox(img.src),{once:true}));
});
