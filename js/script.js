/*********************
*   карта, подложки, генпланы (код выше)
*********************/

/***  Загрузка точек  *********************/
fetch('data/pointsObjects.geojson')
  .then(r => r.json())
  .then(json => {

    /* —- контейнеры категорий —- */
    const combo = {
      buildings : L.layerGroup(),
      landscape : L.layerGroup()
    };

    /* --- маркеры --- */
    L.geoJSON(json,{
      pointToLayer:(f,ll)=>{
        let cat=(f.properties.cat||'buildings').toLowerCase();
        if(cat==='buldings') cat='buildings';
        return L.marker(ll,{icon:icons[cat]||icons.buildings});
      },
      onEachFeature:(f,lyr)=>{
        const p=f.properties||{};

        /* картинки (до 3-х) */
        const pics=['img','img2','img3']
          .filter(k=>p[k])
          .map(s=>`<img class="popup-img" src="${s}" style="cursor:zoom-in"><br>`)
          .join('');

        /* описание */
        const descr = p.descr ? `<div class="popup-text">${p.descr}</div>` : '';

        /* ТЭП */
        const tep=[];
        if(p.buildarea ) tep.push(`Площадь застройки — ${Number(p.buildarea).toLocaleString('ru-RU')} м²`);
        if(p.grossarea ) tep.push(`Общая площадь — ${Number(p.grossarea).toLocaleString('ru-RU')} м²`);
        if(p.usefularea) tep.push(`Полезная площадь — ${Number(p.usefularea).toLocaleString('ru-RU')} м²`);
        if(p.roofarea  ) tep.push(`Экспл. кровля — ${Number(p.roofarea).toLocaleString('ru-RU')} м²`);
        if(p.invest    ) tep.push(`Инвестиции — ${p.invest} млрд ₽`);
        if(p.implement ) tep.push(`Механизм реализации — ${p.implement}`);
        if(p.period    ) tep.push(`Период строительства — ${p.period}`);

        const tepBlock = tep.length
          ? `<details class="popup-tep"><summary>ТЭП</summary><ul><li>${tep.join('</li><li>')}</li></ul></details>`
          : '';

        /* pop-up */
        lyr.bindPopup(`
          ${pics}
          <div class="popup-title">${p.name||''}</div>
          ${descr}
          ${tepBlock}
        `);

        /* в категорию */
        const cat=(p.cat||'buildings').toLowerCase();
        combo[cat].addLayer(lyr);
      }
    });

    /* --- контрол категорий --- */
    const catCtrl=L.control.layers(
      null,
      {
        '<span class="legend-icon orange"></span> Объекты'        : combo.buildings,
        '<span class="legend-icon violet"></span> Благоустройство': combo.landscape
      },
      {collapsed:false,sanitize:false}
    ).addTo(map);

    /* старт: обе категории активны */
    map.addLayer(combo.buildings);
    map.addLayer(combo.landscape);

    /* клик по картинке → лайтбокс */
    map.on('popupopen', e=>{
      e.popup._contentNode.querySelectorAll('.popup-img').forEach(img=>{
        img.addEventListener('click',()=>showLightbox(img.src),{once:true});
      });
    });
  });


/****  Лайтбокс ****/
function showLightbox(src){
  if(document.querySelector('.lb-overlay')) return;
  const w=L.DomUtil.create('div','lb-overlay');
  w.innerHTML=`<button class="lb-close">×</button><img src="${src}" alt="">`;
  document.body.appendChild(w);
  w.querySelector('.lb-close').onclick=()=>w.remove();
  w.onclick=e=>{if(e.target===w)w.remove();};
}


/****  Кнопки зума ****/
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
document.getElementById('toA').onclick=()=>map.fitBounds(b1,{padding:[20,20]});document.getElementById('toB').onclick=()=>map.fitBounds(b2,{padding:[20,20]});


/****  Авторская подпись ****/
L.DomUtil.create('div','map-credit',document.body).innerHTML =
  'Interactive map · <a href="https://t.me/neurourbanism_blog" target="_blank">Neurourbanism</a>';







