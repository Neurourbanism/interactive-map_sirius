/*********************
*   карта, подложки, генпланы
*********************/

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

/* --- overlay-файлы --- */
const mp1 = L.imageOverlay('images/Masterplan1New.webp', b1,{opacity:.8});
const tr1 = L.imageOverlay('images/Transport1New.webp',  b1,{opacity:.7});
const mp2 = L.imageOverlay('images/Masterplan2.webp',    b2,{opacity:.8});
const tr2 = L.imageOverlay('images/Transport2.webp',     b2,{opacity:.7});

/* группы для чек-боксов */
const gen1 = L.layerGroup([mp1]),
      gen2 = L.layerGroup([mp2]),
      trn1 = L.layerGroup([tr1]),
      trn2 = L.layerGroup([tr2]);

gen1.addTo(map);                           // показываем эскизы при старте

L.control.layers(
  null,
  { 'Эскиз'     : L.layerGroup([mp1,mp2]),
    'Транспорт' : L.layerGroup([tr1,tr2]) },
  {collapsed:false}
).addTo(map);


/* ===== КОНФИГ КАТЕГОРИЙ  (—> нужен выше fetch!) ===== */
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


/***  Загрузка точек  *********************/
fetch('data/pointsObjects.geojson')
  .then(r => r.json())
  .then(json => {

    L.geoJSON(json,{
      pointToLayer: (f,ll) => {
        let cat=(f.properties.cat||'buildings').toLowerCase();
        if(cat==='buldings') cat='buildings';
        return L.marker(ll,{icon:icons[cat]});
      },

      onEachFeature: (f,lyr) => {
        const p=f.properties||{};

        /* картинки (до 3-х) */
        const pics=['img','img2','img3']
          .filter(k=>p[k])
          .map(k=>`<img class="popup-img" src="${p[k]}" style="cursor:zoom-in"><br>`)
          .join('');

        /* описание */
        const descr = p.descr ? `<div class="popup-text">${p.descr}</div>` : '';

        /* ТЭП */
        const tep=[];
        if(p.buildarea ) tep.push(`Площадь застройки — ${Number(p.buildarea).toLocaleString('ru-RU')} м²`);
        if(p.grossarea ) tep.push(`Общая площадь — ${Number(p.grossarea ).toLocaleString('ru-RU')} м²`);
        if(p.usefularea) tep.push(`Полезная площадь — ${Number(p.usefularea).toLocaleString('ru-RU')} м²`);
        if(p.roofarea  ) tep.push(`Экспл. кровля — ${Number(p.roofarea  ).toLocaleString('ru-RU')} м²`);
        if(p.invest    ) tep.push(`Инвестиции — ${p.invest} млрд ₽`);
        if(p.implement ) tep.push(`Механизм реализации — ${p.implement}`);
        if(p.period    ) tep.push(`Период строительства — ${p.period}`);

        const tepBlock = tep.length
          ? `<details class="popup-tep"><summary>ТЭП</summary><ul><li>${tep.join('</li><li>')}</li></ul></details>`
          : '';

        lyr.bindPopup(`
          ${pics}
          <div class="popup-title">${p.name||''}</div>
          ${descr}
          ${tepBlock}
        `);

        const cat=(p.cat||'buildings').toLowerCase();
        combo[cat].addLayer(lyr);
      }
    });

    /* контрол категорий */
    L.control.layers(
      null,
      {'<span class="legend-icon orange"></span> Объекты' :
          combo.buildings,
        '<span class="legend-icon violet"></span> Благоустройство' :
          combo.landscape
      },
      {collapsed:false,sanitize:false}
    ).addTo(map);

    /* сразу показываем обе категории */
    map.addLayer(combo.buildings);
    map.addLayer(combo.landscape);

    /* лайтбокс по клику */
    map.on('popupopen', e=>{
      e.popup._contentNode.querySelectorAll('.popup-img').forEach(img=>{
        img.addEventListener('click', ()=>showLightbox(img.src), {once:true});
      });
    });
  });


/****  Лайтбокс ***********************/
function showLightbox(src){
  if(document.querySelector('.lb-overlay')) return;
  const w=L.DomUtil.create('div','lb-overlay');
  w.innerHTML=`<button class="lb-close">×</button><img src="${src}" alt="">`;
  document.body.appendChild(w);
  w.querySelector('.lb-close').onclick=()=>w.remove();
  w.onclick=e=>{if(e.target===w)w.remove();};
}


/****  Кнопки зума  *********************/
const ZoomCtrl=L.Control.extend({
  onAdd(){
    const d=L.DomUtil.create('div','zoom-buttons');
    d.innerHTML=
      '<button id="toA">▣ Участок 1</button>'+
      '<button id="toB">▣ Участок 2</button>';
    return d;
  }
});
map.addControl(new ZoomCtrl({position:'topleft'}));
document.getElementById('toA').onclick = ()=>map.fitBounds(b1,{padding:[20,20]});
document.getElementById('toB').onclick = ()=>map.fitBounds(b2,{padding:[20,20]});


/****  Подпись-кредиты  *******************/
L.DomUtil.create('div','map-credit',document.body).innerHTML =
  'Interactive map · <a href="https://t.me/neurourbanism_blog" target="_blank">Neurourbanism</a>';







