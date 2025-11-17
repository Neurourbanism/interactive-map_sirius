
/* ===== карта и подложки (EPSG:4326) ===== */

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

// Базовая карта OSM/Carto - теперь она тоже должна быть в контроле слоев
const osmBase = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
  {maxZoom:19, attribution:'© OSM, Carto'});
osmBase.addTo(map); // Добавляем по умолчанию

/* === служебные массивы === */
// Эти названия должны СООТВЕТСТВОВАТЬ значениям свойства 'layer' в вашем GeoJSON.
const layers = ['genplan', 'transport']; // <-- Вот это объявление должно быть ОДИН РАЗ
const cats   = ['buildings','landscape'];    // категории
let   activeLayer = 'genplan';               // стартовая подложка, соответствующая 'genplan'

/* --- overlay-файлы --- */
const mp1 = L.imageOverlay('images/Masterplan1New.webp', b1,{opacity:.8});
const tr1 = L.imageOverlay('images/Transport1New.webp',  b1,{opacity:.7});
const mp2 = L.imageOverlay('images/Masterplan2.webp',    b2,{opacity:.8});
const tr2 = L.imageOverlay('images/Transport2.webp',     b2,{opacity:.7});

/* отдельные группы для контрола слоев */
const gen1 = L.layerGroup([mp1]),
      gen2 = L.layerGroup([mp2]),
      trn1 = L.layerGroup([tr1]),
      trn2 = L.layerGroup([tr2]);

/* показываем генплан-1 при загрузке */
gen1.addTo(map); // Добавляем на карту, он будет активным по умолчанию

/* контрол «Слои / Участки» (теперь это БАЗОВЫЕ СЛОИ, т.е. радио-кнопки) */
L.control.layers(
  {
    'Карта (OSM)': osmBase, // Добавляем базовую карту в контрол
    'Участок 1 — генплан'  : gen1,
    'Участок 1 — транспорт': trn1,
    'Участок 2 — генплан'  : gen2,
    'Участок 2 — транспорт': trn2
  },
  null, // Здесь оверлеев нет, только базовые слои
  {collapsed:false}
).addTo(map);

/* ===== категории-контейнеры ===== */
const combo = {};
layers.forEach(l=>{
  combo[l]={};
  cats.forEach(c=> combo[l][c] = L.layerGroup());
});

/* ===== иконки ===== */
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

/* ===== данные ===== */
fetch('data/pointsObjects.geojson')
  .then(r => r.json())
  .then(json => {
    L.geoJSON(json, {
      pointToLayer: (f, ll) => {
        const cat = (f.properties.cat || 'buildings').toLowerCase(); // Обработает NULL как 'buildings'
        return L.marker(ll, { icon: icons[cat] || icons.buildings });
      },
      onEachFeature: (f, lyr) => {
        const p = f.properties || {};
        lyr.bindPopup(`
          ${p.img ? `<img class="popup-img" src="${p.img}" style="cursor:zoom-in"><br>` : ''}
           <div class="popup-title">${p.name || ''}</div>
           ${p.descr ? `<div class="popup-text">${p.descr}</div>` : ''}
        `);
        const lay = (p.layer || 'genplan').toLowerCase(); // Fallback на 'genplan', если в GeoJSON нет 'layer'

        // Проверяем, существует ли combo[lay] и combo[lay][cat] перед добавлением
        if (!combo[lay]) {
            console.warn(`Layer "${lay}" from GeoJSON is not defined in 'layers' array. Marker skipped.`);
            return;
        }
        const cat = (p.cat || 'buildings').toLowerCase();
        if (!combo[lay][cat]) {
            console.warn(`Category "${cat}" from GeoJSON is not defined in 'cats' array for layer "${lay}". Marker skipped.`);
            return;
        }
        combo[lay][cat].addLayer(lyr);
      }
    });

    /* --- контрол «Категории» (для маркеров) --- */
    const catCtrl = L.control.layers(
      null, // Нет базовых слоев
      { // Оверлеи для категорий маркеров
        '<span class="legend-icon orange"></span> Здания'     : L.layerGroup(),
        '<span class="legend-icon violet"></span> Благоустр.' : L.layerGroup()
      },
      {collapsed:false, sanitize:false}
    ).addTo(map);

    /* включаем галочки визуально (добавляем заглушки на карту, чтобы их чекбоксы стали активными) */
    Object.values(catCtrl._layers).forEach(o=> map.addLayer(o.layer));

    /* стартовый набор маркеров: добавляем маркеры для активного слоя ('genplan') и всех категорий */
    cats.forEach(c=> map.addLayer(combo[activeLayer][c]));

    /* смена подложки (реагируем на переключение базовых слоев в L.control.layers для участков) */
    map.on('baselayerchange', e=>{
      // Удаляем маркеры предыдущего активного слоя, если он был
      if (activeLayer) {
        cats.forEach(c=> {
          if (combo[activeLayer] && combo[activeLayer][c]) { // Проверка на существование группы маркеров
            map.removeLayer(combo[activeLayer][c]);
          }
        });
      }

      // Определяем новый activeLayer на основе имени выбранного базового слоя (imageOverlay)
      // Имена здесь должны совпадать с ключами в L.control.layers (первый аргумент)
      if (e.name.includes('генплан')) { // "Участок 1 — генплан" или "Участок 2 — генплан"
          activeLayer = 'genplan';
      } else if (e.name.includes('транспорт')) { // "Участок 1 — транспорт" или "Участок 2 — транспорт"
          activeLayer = 'transport';
      } else {
          // Если выбрана базовая карта OSM, или какой-то неопознанный слой,
          // можно решить, что маркеры не должны отображаться
          activeLayer = null; // Устанавливаем в null, чтобы предотвратить добавление маркеров
          return; // Выходим, не добавляя маркеры
      }

      // Добавляем маркеры для нового активного слоя, только для тех категорий, которые сейчас включены
      if (activeLayer) { // Только если activeLayer не null
        Object.values(catCtrl._layers).forEach(o=>{
          const c = o.name.includes('Здания') ? 'buildings' : 'landscape';
          if(map.hasLayer(o.layer)) { // Проверяем, включен ли чекбокс этой категории
            if (combo[activeLayer] && combo[activeLayer][c]) { // Проверка на существование группы маркеров
              map.addLayer(combo[activeLayer][c]);
            }
          }
        });
      }
    });

    /* категории on/off (эти слушатели относятся к catCtrl - контролу категорий маркеров) */
    map.on('overlayadd',   e=>{
      // Добавляем маркеры соответствующей категории для текущего activeLayer
      const c = e.name.includes('Здания') ? 'buildings' : 'landscape';
      if (activeLayer && combo[activeLayer] && combo[activeLayer][c]) {
        map.addLayer(combo[activeLayer][c]);
      }
    });
    map.on('overlayremove',e=>{
      // Удаляем маркеры соответствующей категории для текущего activeLayer
      const c = e.name.includes('Здания') ? 'buildings' : 'landscape';
      if (activeLayer && combo[activeLayer] && combo[activeLayer][c]) {
        map.removeLayer(combo[activeLayer][c]);
      }
    });
  }); // Закрытие .then(json => { ... });

/* ── кнопки зума ───────────────────── */
const ZoomCtrl = L.Control.extend({
  onAdd(){
    const d = L.DomUtil.create('div','zoom-buttons');
    d.innerHTML =
      '<button id="toA">▣ Участок 1</button>' +
      '<button id="toB">▣ Участок 2</button>';
    return d;
  }
});
map.addControl(new ZoomCtrl({position:'topleft'}));

document.getElementById('toA').onclick = ()=> map.fitBounds(b1,{padding:[20,20]});
document.getElementById('toB').onclick = ()=> map.fitBounds(b2,{padding:[20,20]});

/* ===== лайтбокс ===== */
function showLightbox(src){
  if(document.querySelector('.lb-overlay')) return;
  const w=document.createElement('div');
  w.className='lb-overlay';
  w.innerHTML = `<button class="lb-close">×</button><img src="${src}" alt="">`;
  document.body.appendChild(w);
  w.querySelector('.lb-close').onclick = ()=> w.remove();
  w.onclick = e=>{ if(e.target===w) w.remove(); };
}
map.on('popupopen', e=>{
  const img = e.popup._contentNode.querySelector('.popup-img');
  if(img) img.addEventListener('click', ()=> showLightbox(img.src));
});
