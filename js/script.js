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

/* ======================  загрузка точек  ====================== */
fetch('data/pointsObjects.geojson')
  .then(r => r.json())
  .then(json => {

    L.geoJSON(json,{
      pointToLayer:(f,ll)=>{
        /* приводим cat к objects|landscape */
        let cat = (f.properties.cat || 'objects').toLowerCase();
        if (cat==='buildings'||cat==='buldings') cat='objects';
        return L.marker(ll,{icon:icons[cat]||icons.objects});
      },

      onEachFeature:(f,lyr)=>{
        const p = f.properties||{};

        /* ------ картинки (до трёх) ------ */
        const imgs = [p.img, p.img2, p.img3].filter(Boolean);
        const imgHtml = imgs.map(url=>`<img class="popup-img" src="${url}">`).join('');

        /* ------ раскрывашка ТЭП ------ */
        const tep = [];
        if(p.buildarea) tep.push(`Площадь застройки — ${Number(p.buildarea).toLocaleString('ru-RU')} м²`);
        if(p.grossarea) tep.push(`Общая площадь — ${Number(p.grossarea).toLocaleString('ru-RU')} м²`);
        if(p.usefularea)tep.push(`Полезная площадь — ${Number(p.usefularea).toLocaleString('ru-RU')} м²`);
        if(p.roofarea)  tep.push(`Эксплуатируемая кровля — ${Number(p.roofarea).toLocaleString('ru-RU')} м²`);
        if(p.invest)    tep.push(`Инвестиции — ${p.invest} млрд ₽`);
        if(p.implement) tep.push(`Механизм реализации — ${p.implement}`);
        if(p.period)    tep.push(`Период строительства — ${p.period}`);

        const tepBlock = tep.length
          ? `<details class="popup-tep">
               <summary>ТЭП</summary>
               <ul><li>${tep.join('</li><li>')}</li></ul>
             </details>`
          : '';

        /* ------ pop-up ------ */
        lyr.bindPopup(`
          ${imgHtml}
          <div class="popup-title">${p.name||''}</div>
          ${p.descr ? `<div class="popup-text">${p.descr}</div>` : ''}
          ${tepBlock});

        /* ------ по категориям ------ */
        const cat = (p.cat||'objects').toLowerCase();
        combo[cat].addLayer(lyr);

        /* все маркеры сразу на карте (категории можно выключить) */
        combo[cat].addTo(map);
      }
    });

    /* ===== контрол категорий ===== */
    L.control.layers(
      null,
      {
        '<span class="legend-icon orange"></span> Объекты'        : combo.objects,
        '<span class="legend-icon violet"></span> Благоустройство': combo.landscape
      },
      { collapsed:false , sanitize:false }
    ).addTo(map);
});

/* ======================  лайтбокс для любой картинки  ====================== */
function showLightbox(src){
  if(document.querySelector('.lb-overlay')) return;
  const w = L.DomUtil.create('div','lb-overlay');
  w.innerHTML = <button class="lb-close">×</button><img src="${src}" alt="">;
  document.body.appendChild(w);
  w.querySelector('.lb-close').onclick = ()=> w.remove();
  w.onclick = e=>{ if(e.target===w) w.remove(); };
}
/* делегирование: ловим клики на .popup-img */
map.on('popupopen', e=>{
  e.popup._contentNode.querySelectorAll('.popup-img')
    .forEach(img => img.addEventListener('click', ()=>showLightbox(img.src), {once:true}));
});

/* ======================  кнопки зума  ====================== */
const ZoomCtrl = L.Control.extend({
  onAdd(){
    const d=L.DomUtil.create('div','zoom-buttons');
    d.innerHTML =
      '<button id="toA">▣ Участок 1</button>'+
      '<button id="toB">▣ Участок 2</button>'+
      '<button id="toBoth">▣ Оба</button>';
    return d;
  }
});
map.addControl(new ZoomCtrl({position:'topleft'}));

document.getElementById('toA').onclick    = ()=> map.fitBounds(b1,{padding:[20,20]});
document.getElementById('toB').onclick    = ()=> map.fitBounds(b2,{padding:[20,20]});
document.getElementById('toBoth').onclick = ()=> map.fitBounds(b1.extend(b2),{padding:[60,60]});





