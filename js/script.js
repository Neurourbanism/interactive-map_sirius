/***********
 * карта, подложки, генпланы
 ***********/
const b1 = L.latLngBounds(
  [43.4106095120386968, 39.95101101168743],
  [43.4173891758608832, 39.96542148920572]
);
const b2 = L.latLngBounds(
  [43.395917235035576 , 39.98298856123352],
  [43.404276445202839 , 39.99223406925298]
);

const map = L.map('map').fitBounds(b1,{padding:[40,40]});
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
  {maxZoom:19, attribution:'© OSM, Carto'}).addTo(map);

/* --- overlay-файлы --- */
const mp1 = L.imageOverlay('images/Masterplan1New.webp', b1,{opacity:.8});
const mp2 = L.imageOverlay('images/Masterplan2.webp',    b2,{opacity:.8});
const tr1 = L.imageOverlay('images/Transport1New.webp',  b1,{opacity:.7});
const tr2 = L.imageOverlay('images/Transport2.webp',     b2,{opacity:.7});

/* группы под чек-боксы */
const sketchGroup     = L.layerGroup([mp1,mp2]).addTo(map);   // «Эскиз» включён сразу
const transportGroup  = L.layerGroup([tr1,tr2]);              // будет включаться вручную

/* основной контрол слоёв */
L.control.layers(
  null,
  { 'Эскиз'    : sketchGroup,
    'Транспорт': transportGroup },
  { collapsed:false }
).addTo(map);

/*************************
 * 1. КОНФИГ КАТЕГОРИЙ ОБЪЕКТОВ (точки)
 *************************/
const combo = { buildings:L.layerGroup(), landscape:L.layerGroup() };
const icons = {
  buildings : L.icon({ iconUrl:'icons/marker-orange.png',
                       shadowUrl:'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
                       iconSize:[25,41], iconAnchor:[12,41] }),
  landscape : L.icon({ iconUrl:'icons/marker-violet.png',
                       shadowUrl:'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
                       iconSize:[25,41], iconAnchor:[12,41] })
};

/*************************
 * 2. ЗАГРУЗКА ТОЧЕК
 *************************/
fetch('data/pointsObjects.geojson')
 .then(r=>r.json())
 .then(json=>{
   L.geoJSON(json,{
     pointToLayer:(f,ll)=>{
       let cat=(f.properties.cat||'buildings').toLowerCase();
       if(cat==='buldings') cat='buildings';      // опечатка в данных
       return L.marker(ll,{icon:icons[cat]});
     },
     onEachFeature:(f,lyr)=>{
       const p=f.properties||{};

       /* картинки (до 3-х) */
       const imgs=[p.img,p.img2,p.img3]
         .filter(Boolean)
         .map(src=>`<img class="popup-img" src="${src}" style="cursor:zoom-in">`)
         .join('<br>');

       /* описание */
       const descr = p.descr ? `<div class="popup-text">${p.descr}</div>` : '';

       /* ТЭП */
       const list=[];
       if(p.buildarea)  list.push(`Площадь застройки — ${(+p.buildarea).toLocaleString('ru-RU')} м²`);
       if(p.grossarea)  list.push(`Общая площадь — ${(+p.grossarea).toLocaleString('ru-RU')} м²`);
       if(p.usefularea) list.push(`Полезная площадь — ${(+p.usefularea).toLocaleString('ru-RU')} м²`);
       if(p.roofarea)   list.push(`Экспл. кровля — ${(+p.roofarea).toLocaleString('ru-RU')} м²`);
       if(p.invest)     list.push(`Инвестиции — ${p.invest} млрд ₽`);
       if(p.implement)  list.push(`Механизм реализации — ${p.implement}`);
       if(p.period)     list.push(`Период строительства — ${p.period}`);

       const tep = list.length
         ? `<details class="popup-tep"><summary>ТЭП</summary><ul><li>${list.join('</li><li>')}</li></ul></details>`
         : '';

       lyr.bindPopup(`${imgs}<div class="popup-title">${p.name||''}</div>${descr}${tep}`);

       combo[(p.cat||'buildings').toLowerCase()].addLayer(lyr);
     }
   });
 });

/*************************
 * 3. ЛЕГЕНДА КАТЕГОРИЙ (всегда видна)
 *************************/
L.control.layers(
  null,
  { '<span class="legend-icon orange"></span> Объекты'        : combo.buildings,
    '<span class="legend-icon violet"></span> Благоустрой.'   : combo.landscape },{ collapsed:false , sanitize:false , position:'topright' }
).addTo(map);

/*************************
 * 4. ТРАНСПОРТ – ПОДСЛОИ (5 GeoJSON)
 *************************/
const loadLine =(url,color,w=2,extra={})=>{
  fetch(url).then(r=>r.json()).then(j=>{
    L.geoJSON(j,{style:{color,weight:w,opacity:1,...extra}})
      .addTo(transportGroup);
  });
};
const loadPoint=(url,color,r=6)=>{
  fetch(url).then(r=>r.json()).then(j=>{
    L.geoJSON(j,{
      pointToLayer:(_,ll)=>L.circleMarker(ll,{
        radius:r,weight:0,fillColor:color,fillOpacity:.9
      })
    }).addTo(transportGroup);
  });
};

/* сами подслои */
loadLine ('data/bike.geojson'     ,'00a4ff', 3);
loadPoint('data/busstop.geojson'  ,'ff66cc', 5);
loadPoint('data/entrance.geojson' ,'ff0000', 5);
loadLine ('data/parking.geojson'  ,'888888', 2,{dashArray:'4 3'});
loadPoint('data/railway2.geojson' ,'8b4513', 6);

/* легенда-тогглер подслоёв транспорта */
L.control.layers(
  null,
  {
    '<span class="legend-icon" style="background:00a4ff"></span> Велодорожки' : transportGroup.getLayers()[0],
    '<span class="legend-icon" style="background:ff66cc"></span> Остановки'   : transportGroup.getLayers()[1],
    '<span class="legend-icon" style="background:ff0000"></span> Въезды'      : transportGroup.getLayers()[2],
    '<span class="legend-icon" style="background:888888"></span> Паркинги'    : transportGroup.getLayers()[3],
    '<span class="legend-icon" style="background:8b4513"></span> Ж/д станции' : transportGroup.getLayers()[4]
  },
  { collapsed:false , sanitize:false , position:'topright' }
).addTo(transportGroup);   // живёт внутри чек-бокса «Транспорт»

/*************************
 * 5. Лайтбокс
 *************************/
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
  e.popup._contentNode.querySelectorAll('.popup-img')
    .forEach(img=>img.addEventListener('click',()=>showLightbox(img.src),{once:true}));
});

/*************************
 * 6. Кнопки зума
 *************************/
const ZoomBox=L.Control.extend({
  onAdd(){
    const d=L.DomUtil.create('div','zoom-buttons');
    d.innerHTML =
      '<button id="toA">▣ Участок 1</button>'+
      '<button id="toB">▣ Участок 2</button>';
    return d;
  }
});
map.addControl(new ZoomBox({position:'topleft'}));
document.getElementById('toA').onclick = ()=>map.fitBounds(b1,{padding:[20,20]});
document.getElementById('toB').onclick = ()=>map.fitBounds(b2,{padding:[20,20]});

/*************************
 * 7. Фирменная подпись (одно лого)
 *************************/
if(!document.querySelector('.brand-link')){
  const br=document.createElement('a');
  br.className='brand-link';
  br.href='https://t.me/neurourbanism_blog';
  br.target='_blank';
  br.textContent='Neurourbanism ©';
  document.body.appendChild(br);
}
