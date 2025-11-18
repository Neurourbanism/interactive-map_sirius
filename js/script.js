/* ======================  карта и подложки (EPSG:4326)  ====================== */

/* границы участка-1 (Г-образный) */
const b1 = L.latLngBounds(
  [43.4106095120386968, 39.95101101168743],
  [43.4173891758608832, 39.96542148920572]
);

/* границы участка-2 (прямоугольный) */
const b2 = L.latLngBounds(
  [43.395917235035576 , 39.98298856123352],
  [43.404276445202839 , 39.99223406925298]
);

/* карта. Стартуем — зум на участок-1 */
const map = L.map('map').fitBounds(b1,{padding:[40,40]});

L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
  { maxZoom:19, attribution:'© OSM, Carto' }
).addTo(map);

/* -------- растры -------- */
const mp1 = L.imageOverlay('images/Masterplan1New.webp', b1,{opacity:.85});
const tr1 = L.imageOverlay('images/Transport1New.webp',  b1,{opacity:.65});
const mp2 = L.imageOverlay('images/Masterplan2.webp',    b2,{opacity:.85});
const tr2 = L.imageOverlay('images/Transport2.webp',     b2,{opacity:.65});

/* одна группа = один чек-бокс */
const sketchGrp = L.layerGroup([mp1, mp2]).addTo(map);      // «Эскиз» – по-умолчанию
const transGrp  = L.layerGroup([tr1, tr2]);                  // «Транспорт»

/* контрол «Слои» – два чек-бокса */
L.control.layers(
  null,
  {
    'Эскиз'     : sketchGrp,
    'Транспорт' : transGrp
  },
  { collapsed:false }
).addTo(map);

/* ======================  категории / иконки  ====================== */

const cats = ['objects','landscape'];      // Объекты / Благоустройство
const combo = { objects:L.layerGroup(), landscape:L.layerGroup() };

const icons = {
  objects : L.icon({
    iconUrl :'icons/marker-orange.png',
    shadowUrl:'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize:[25,41], iconAnchor:[12,41], shadowSize:[41,41]
  }),
  landscape : L.icon({
    iconUrl :'icons/marker-violet.png',
    shadowUrl:'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize:[25,41], iconAnchor:[12,41], shadowSize:[41,41]
  })
};

/***  Загрузка точек  *********************/
fetch('data/pointsObjects.geojson')
  .then(r => r.json())
  .then(json => {

    /* —- контейнеры категорий (НЕ зависит от layer) —- */
    const combo = {
      buildings  : L.layerGroup(),
      landscape  : L.layerGroup()
    };

    /* --- добавляем маркеры --- */
    L.geoJSON(json,{
      pointToLayer:(f, ll)=>{
        let cat = (f.properties.cat || 'buildings').toLowerCase();
        if(cat==='buldings') cat = 'buildings';     // фиксим опечатку
        return L.marker(ll,{icon: icons[cat] || icons.buildings});
      },
      onEachFeature:(f, lyr)=>{
        const p = f.properties||{};

        /* превью-картинки (до 3-х) */
        const thumbs = ['img','img2','img3']
          .filter(k => p[k])
          .map(src => `<img class="popup-img" src="${src}" style="cursor:zoom-in"><br>`)
          .join('');

        /* описание */
        const descr  = p.descr ? `<div class="popup-text">${p.descr}</div>` : '';

        /* ТЭП */
        const tep = [];
        if (p.buildarea ) tep.push(`Площадь застройки — ${Number(p.buildarea).toLocaleString('ru-RU')} м²`);
        if (p.grossarea ) tep.push(`Общая площадь — ${Number(p.grossarea).toLocaleString('ru-RU')} м²`);
        if (p.usefularea) tep.push(`Полезная площадь — ${Number(p.usefularea).toLocaleString('ru-RU')} м²`);
        if (p.roofarea  ) tep.push(`Экспл. кровля — ${Number(p.roofarea).toLocaleString('ru-RU')} м²`);
        if (p.invest    ) tep.push(`Инвестиции — ${p.invest} млрд ₽`);
        if (p.implement ) tep.push(`Механизм реализации — ${p.implement}`);
        if (p.period    ) tep.push(`Период строительства — ${p.period}`);

        const tepBlock = tep.length ?
          `<details class="popup-tep"><summary>ТЭП</summary><ul><li>${tep.join('</li><li>')}</li></ul></details>` : '';

        lyr.bindPopup(`
          ${thumbs}
          <div class="popup-title">${p.name||''}</div>
          ${descr}
          ${tepBlock}
        `);

        /* добавляем маркер в группу категории */
        const cat = (p.cat || 'buildings').toLowerCase();
        combo[cat].addLayer(lyr);
      }
    });

    /* --- контрол категорий ----------------------------------- */
    const catCtrl = L.control.layers(
      null,
      {
        '<span class="legend-icon orange"></span> Объекты'        : combo.buildings,
        '<span class="legend-icon violet"></span> Благоустройство': combo.landscape
      },
      { collapsed:false, sanitize:false }
    ).addTo(map);

    /* при старте обе категории уже на карте */
    map.addLayer(combo.buildings);
    map.addLayer(combo.landscape);

    /* клик по превью — лайтбокс */
    map.on('popupopen', e=>{
      e.popup._contentNode.querySelectorAll('.popup-img').forEach(img=>{
        img.addEventListener('click', ()=>showLightbox(img.src), {once:true});
      });
    });
  });


/***  Лайтбокс  ***********************/
function showLightbox(src){
  if(document.querySelector('.lb-overlay')) return;
  const w = L.DomUtil.create('div','lb-overlay');
  w.innerHTML = `<button class="lb-close">×</button><img src="${src}" alt="">`;
  document.body.appendChild(w);
  w.querySelector('.lb-close').onclick = ()=>w.remove();
  w.onclick = e=>{ if(e.target===w) w.remove(); };
}


/***  Кнопки зума  **********************/
const ZoomCtrl = L.Control.extend({
  onAdd(){
    const d = L.DomUtil.create('div','zoom-buttons');
    d.innerHTML =
      '<button id="toA">▣ Участок 1</button>' +
      '<button id="toB">▣ Участок 2</button>';
    return d;
  }
});
map.addControl(new ZoomCtrl({position:'topleft'}));document.getElementById('toA').onclick = ()=> map.fitBounds(b1,{padding:[20,20]});
document.getElementById('toB').onclick = ()=> map.fitBounds(b2,{padding:[20,20]});






