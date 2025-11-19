/* === служебные массивы для наших маркеров === */
const cats = ['buildings', 'landscape'];          // категории
const combo = {                                   // контейнеры маркеров
  buildings: L.layerGroup(),
  landscape: L.layerGroup()
};
const icons = {                                   // иконки двух цветов
  buildings: L.icon({
    iconUrl : 'icons/marker-orange.png',
    shadowUrl:'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize:[25,41], iconAnchor:[12,41], shadowSize:[41,41]
  }),
  landscape: L.icon({
    iconUrl : 'icons/marker-violet.png',
    shadowUrl:'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize:[25,41], iconAnchor:[12,41], shadowSize:[41,41]
  })
};

/* === карта + эскизы (блок «Sketch») ============================ */
const b1 = L.latLngBounds([43.4106095120387,39.9510110116874],
                          [43.4173891758609,39.9654214892057]);
const b2 = L.latLngBounds([43.3959172350356,39.9829885612335],
                          [43.4042764452028,39.9922340692530]);

const map = L.map('map').fitBounds(b1,{padding:[40,40]});
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
            {maxZoom:19, attribution:'© OSM, Carto'}).addTo(map);

const sketch = L.layerGroup([
  L.imageOverlay('images/Masterplan1New.webp', b1, {opacity:.8}),
  L.imageOverlay('images/Masterplan2.webp'   , b2, {opacity:.8})
]).addTo(map);

const transportRaster = L.layerGroup([
  L.imageOverlay('images/Transport1New.webp', b1, {opacity:.7}),
  L.imageOverlay('images/Transport2.webp',    b2, {opacity:.7})
]);

/* === транспорт-GEOJSON-группа (будет внутри «Транспорт») ====== */
const transportGroup = L.layerGroup();      // здесь 5 под-слоёв

/* === чек-боксы верхнего уровня (Sketch / Транспорт) =========== */
L.control.layers(
  null,
  { 'Эскиз'     : sketch,
    'Транспорт' : L.layerGroup([transportRaster, transportGroup]) },
  { collapsed:false }
).addTo(map);

/* === под-слои транспорта (5 geojson) ========================== */
const loadLine = (url, color, weight=2, extra={})=>{
  fetch(url).then(r=>r.json()).then(j=>{
    L.geoJSON(j,{ style:{color:''+color,weight,...extra} })
     .addTo(transportGroup);
  });
};
const loadPoint = (url, color, r=6)=>{
  fetch(url).then(r=>r.json()).then(j=>{
    L.geoJSON(j,{
      pointToLayer:(_,ll)=>L.circleMarker(ll,{
        radius:r, color:'000', weight:1, fillColor:''+color, fillOpacity:.9
      })
    }).addTo(transportGroup);
  });
};

loadLine ('data/bike.geojson'    ,'00a4ff',2.5);           // велодорожки
loadPoint('data/busstop.geojson' ,'ff66cc',5 );            // остановки ОТ
loadPoint('data/entrance.geojson','ff0000',5 );            // въезды/выезды
loadLine ('data/parking.geojson' ,'666666',1 ,{dashArray:'4 3'}); // парковки
loadPoint('data/railway2.geojson','8b4513',6 );            // Ж/д станции

/* === мини-контрол под-слоёв транспорта ======================== */
const subCtrl = L.control.layers(
  null,
  {'<span class="legend-icon" style="background:00a4ff"></span> Велодорожки'   : transportGroup.getLayers()[0],
    '<span class="legend-icon" style="background:ff66cc"></span> Остановки ОТ' : transportGroup.getLayers()[1],
    '<span class="legend-icon" style="background:ff0000"></span> Въезды/выезды': transportGroup.getLayers()[2],
    '<span class="legend-icon" style="background:666666"></span> Парковки'     : transportGroup.getLayers()[3],
    '<span class="legend-icon" style="background:8b4513"></span> Ж/д станции'  : transportGroup.getLayers()[4]
  },
  { collapsed:false, position:'topright', sanitize:false }
).addTo(map);

/* === загрузка ОПИСАНИЙ-точек ================================= */
fetch('data/pointsObjects.geojson')
 .then(r=>r.json())
 .then(json=>{
   L.geoJSON(json,{
     pointToLayer:(f,ll)=>{
       let cat=(f.properties.cat||'buildings').toLowerCase();
       if(cat==='buldings') cat='buildings';
       return L.marker(ll,{icon:icons[cat]});
     },
     onEachFeature:(f,lyr)=>{
       const p=f.properties||{};
       /* Картинки (до 3) */
       const imgs=[p.img,p.img2,p.img3].filter(Boolean)
         .map(s=>`<img class="popup-img" src="${s}" style="cursor:zoom-in">`)
         .join('<br>');
       /* описание */
       const descr = p.descr ? `<div class="popup-text">${p.descr}</div>` : '';
       /* ТЭП */
       const tpl=n=>Number(n).toLocaleString('ru-RU');
       const list=[];
       if(p.buildarea) list.push(`Площадь застройки — ${tpl(p.buildarea)} м²`);
       if(p.grossarea) list.push(`Общая площадь — ${tpl(p.grossarea)} м²`);
       if(p.usefularea)list.push(`Полезная площадь — ${tpl(p.usefularea)} м²`);
       if(p.roofarea)  list.push(`Экспл. кровля — ${tpl(p.roofarea)} м²`);
       if(p.invest)    list.push(`Инвестиции — ${p.invest} млрд ₽`);
       if(p.implement) list.push(`Механизм реализации — ${p.implement}`);
       if(p.period)    list.push(`Период строительства — ${p.period}`);
       const tep = list.length
        ? `<details class="popup-tep"><summary>ТЭП</summary><ul><li>${list.join('</li><li>')}</li></ul></details>`
        : '';
       lyr.bindPopup(`${imgs}<div class="popup-title">${p.name||''}</div>${descr}${tep}`);
       /* складываем в группу для категории-легенды */
       combo[(p.cat||'buildings').toLowerCase()].addLayer(lyr);
     }
   });
 });

/* === контрол «Объекты / Благоустройство» ===================== */
L.control.layers(
  null,
  {
    '<span class="legend-icon orange"></span> Объекты'        : combo.buildings,
    '<span class="legend-icon violet"></span> Благоустр.'     : combo.landscape
  },
  { collapsed:false, sanitize:false, position:'topright' }
).addTo(map);

/* === кнопки «Участок 1 / 2» ================================== */
const ZoomCtrl=L.Control.extend({
  onAdd(){
    const d=L.DomUtil.create('div','zoom-buttons');
    d.innerHTML='<button id="toA">▣ Участок 1</button>'+
                '<button id="toB">▣ Участок 2</button>';
    return d;
  }
});
map.addControl(new ZoomCtrl({position:'topleft'}));
document.getElementById('toA').onclick=()=>map.fitBounds(b1,{padding:[20,20]});
document.getElementById('toB').onclick=()=>map.fitBounds(b2,{padding:[20,20]});

/* === лайтбокс ================================================ */
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
