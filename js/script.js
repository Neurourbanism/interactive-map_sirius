/********** 1. карта + генпланы **********/
const b1 = L.latLngBounds([43.4106095120387 ,39.95101101168743],
                          [43.41738917586088,39.96542148920572]);
const b2 = L.latLngBounds([43.3959172350356 ,39.98298856123352],
                          [43.40427644520284,39.99223406925298]);

const map = L.map('map').fitBounds(b1,{padding:[40,40]});
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
  {maxZoom:19, attribution:'© OSM, Carto'}).addTo(map);

const genSketch = L.layerGroup([
  L.imageOverlay('images/Masterplan1New.webp', b1,{opacity:.85}),
  L.imageOverlay('images/Masterplan2.webp'   , b2,{opacity:.85})
]).addTo(map);                     // видно при старте

const TRANSPORT_LABEL = 'Транспорт';
const transportGroup = L.layerGroup();
const transportLayers = {};
const transportCheckboxes = {};
const transportVisibility = {};
const transportState = {master:false};
const mergeTolerance = 0.00015;

const cloneCoords = coords => coords.map(pair=>[pair[0],pair[1]]);
const collectLineStringCoords = featureCollection=>{
  const coordsCollection = [];
  (featureCollection.features||[]).forEach(feature=>{
    const geometry = feature.geometry;
    if(!geometry) return;
    if(geometry.type==='LineString'){
      coordsCollection.push(cloneCoords(geometry.coordinates));
      return;
    }
    if(geometry.type==='MultiLineString'){
      geometry.coordinates.forEach(part=>coordsCollection.push(cloneCoords(part)));
    }
  });
  return coordsCollection;
};

const mergeLineSegments = (coordsSets,tolerance)=>{
  if(!coordsSets.length) return [];
  const toleranceSq = tolerance*tolerance;
  const arePointsClose = (a,b)=>{
    const dx=a[0]-b[0];
    const dy=a[1]-b[1];
    return (dx*dx+dy*dy)<=toleranceSq;
  };
  const merged = [];
  const used = new Array(coordsSets.length).fill(false);
  for(let i=0;i<coordsSets.length;i++){
    if(used[i]) continue;
    let current = coordsSets[i].slice();
    used[i]=true;
    let changed = true;
    while(changed){
      changed=false;
      for(let j=0;j<coordsSets.length;j++){
        if(used[j]) continue;
        const candidate = coordsSets[j];
        const firstCurrent=current[0];
        const lastCurrent=current[current.length-1];
        const firstCandidate=candidate[0];
        const lastCandidate=candidate[candidate.length-1];
        if(arePointsClose(lastCurrent, firstCandidate)){
          current=current.concat(candidate.slice(1));
        }else if(arePointsClose(lastCurrent, lastCandidate)){
          current=current.concat(candidate.slice(0,-1).reverse());
        }else if(arePointsClose(firstCurrent, lastCandidate)){
          current=candidate.concat(current.slice(1));
        }else if(arePointsClose(firstCurrent, firstCandidate)){
          current=candidate.slice().reverse().concat(current.slice(1));
        }else{
          continue;
        }
        used[j]=true;
        changed=true;
      }
    }
    merged.push(current);
  }
  return merged;
};

const mergeLineStringFeatures = (featureCollection,tolerance)=>{
  const coordsSets = collectLineStringCoords(featureCollection);
  if(!coordsSets.length) return featureCollection;
  const mergedCoords = mergeLineSegments(coordsSets,tolerance);
  if(!mergedCoords.length) return featureCollection;
  const mergedFeatures = mergedCoords.map(coords=>({
    type:'Feature',
    properties:{},
    geometry:{type:'LineString',coordinates:coords}
  }));
  const preservedOthers = (featureCollection.features||[]).filter(feature=>{
    const geomType = feature?.geometry?.type;
    return geomType && geomType!=='LineString' && geomType!=='MultiLineString';
  });
  return {
    type:'FeatureCollection',
    features:[...mergedFeatures,...preservedOthers]
  };
};

const transportConfigs = [
  {
    id:'bikeExist',
    url:'data/bikeExist.geojson',
    label:'Сущ велодорожки',
    legendClass:'scarlet-solid',
    geometry:'line',
    color:'#ff3b30',
    weight:5,
    mergeLines:true
  },
  {
    id:'bikeProject',
    sources:['data/bikeNew.geojson','data/bikeNew2.geojson'],
    label:'Проект велодорожки',
    legendClass:'scarlet-dash',
    geometry:'line',
    color:'#ff3b30',
    weight:5,
    dashArray:'10 6',
    mergeLines:true
  },
  {
    id:'busstopDelete',
    url:'data/busstopDelete.geojson',
    label:'Отмен остановки',
    legendClass:'red',
    geometry:'point',
    color:'#ff4f4f',
    radius:6
  },
  {
    id:'busstopExist',
    url:'data/busstopExist.geojson',
    label:'Сущ остановки',
    legendClass:'pink',
    geometry:'point',
    color:'#ff6ec7',
    radius:7
  },
  {
    id:'busstopNew',
    url:'data/busstopNew.geojson',
    label:'Проект остановки',
    legendClass:'green',
    geometry:'point',
    color:'#2cc26d',
    radius:7
  },
  {
    id:'entrance',
    url:'data/entrance.geojson',
    label:'Въезды/выезды',
    legendClass:'yellow',
    geometry:'point',
    color:'#f5c342',
    radius:7
  },
  {
    id:'railwayExist',
    url:'data/railwayExist.geojson',
    label:'Сущ ж/д',
    legendClass:'navy',
    geometry:'point',
    color:'#1b3a6f',
    radius:8
  },
  {
    id:'railwayProject',
    url:'data/railwayNew.geojson',
    label:'Проект ж/д',
    legendClass:'sky',
    geometry:'point',
    color:'#5bd4ff',
    radius:8
  },
  {
    id:'parking',
    url:'data/parking.geojson',
    label:'Паркинг',
    legendClass:'gray',
    geometry:'polygon',
    color:'#8f8f8f',
    fillOpacity:.5
  },
  {
    id:'radius',
    url:'data/radius.geojson',
    label:'Доступность остановок',
    legendClass:'blue-outline',
    geometry:'polygon',
    color:'#2a6af7',
    weight:3,
    strokeOnly:true,
    dashArray:'6 6'
  }
];

const createTransportLayer = config => {
  if(config.geometry==='line'){
    return L.geoJSON(null,{
      style:{
        color:config.color,
        weight:config.weight||3,
        opacity:config.opacity??.95,
        lineCap:'round',
        lineJoin:'round',
        dashArray:config.dashArray||null
      },
      smoothFactor:config.smoothFactor??1
    });
  }
  if(config.geometry==='polygon'){
    return L.geoJSON(null,{
      style:{
        color:config.color,
        weight:config.weight||1,
        dashArray:config.dashArray||null,
        fillColor:config.strokeOnly ? 'transparent' : (config.fillColor||config.color),
        fillOpacity:config.strokeOnly ? 0 : (config.fillOpacity??.6),
        opacity:config.opacity??1
      }
    });
  }
  return L.geoJSON(null,{
    pointToLayer:(_feature,latLng)=>{
      return L.circleMarker(latLng,{
        radius:config.radius||6,
        color:config.color,
        weight:config.pointStrokeWeight||1,
        fillColor:config.fillColor||config.color,
        fillOpacity:config.fillOpacity??.85,
        opacity:config.opacity??1
      });
    }
  });
};

const getSourcesList = config => {
  if(Array.isArray(config.sources) && config.sources.length) return config.sources;
  if(config.url) return [config.url];
  return [];
};

const loadTransportData = config => {
  const sources = getSourcesList(config);
  if(!sources.length) return Promise.resolve({type:'FeatureCollection',features:[]});
  return Promise.all(
    sources.map(src=>fetch(src).then(res=>res.json()))
  ).then(datasets=>{
    const combined = {
      type:'FeatureCollection',
      features:[]
    };
    datasets.forEach(data=>{
      if(!data) return;
      if(data.type==='FeatureCollection'){
        combined.features.push(...(data.features||[]));
        return;
      }
      if(data.type==='Feature' && data.geometry){
        combined.features.push(data);
      }
    });
    if(!combined.features.length) return combined;
    if(config.mergeLines) return mergeLineStringFeatures(combined, mergeTolerance);
    return combined;
  });
};

const transportControl = L.control.layers(
  null,
  {
    'Эскиз':genSketch,
    [TRANSPORT_LABEL]:transportGroup
  },
  {collapsed:false}
).addTo(map);

const applyTransportVisibility = () => {
  if(!transportState.master) return;
  transportGroup.clearLayers();
  transportConfigs.forEach(cfg=>{
    if(!transportVisibility[cfg.id]) return;
    const layer = transportLayers[cfg.id];
    if(!layer) return;
    transportGroup.addLayer(layer);
  });
};

const toggleSingleTransportLayer = (layerId, isEnabled) => {
  if(!transportState.master) return;
  const layer = transportLayers[layerId];
  if(!layer) return;
  const hasLayer = transportGroup.hasLayer(layer);
  if(isEnabled && !hasLayer){
    transportGroup.addLayer(layer);
    return;
  }
  if(!isEnabled && hasLayer){
    transportGroup.removeLayer(layer);
  }
};

const setTransportMasterState = isEnabled => {
  if(transportState.master===isEnabled) return;
  transportState.master = isEnabled;
  Object.values(transportCheckboxes).forEach(input=>{
    input.disabled = !isEnabled;
    input.classList.toggle('transport-layer-toggle__checkbox--disabled',!isEnabled);
  });
  if(isEnabled){
    applyTransportVisibility();
    return;
  }
  transportGroup.clearLayers();
};

const handleTransportLayerChange = event => {
  const input = event.currentTarget;
  if(!input) return;
  const layerId = input.dataset.layerId;
  if(!layerId) return;
  transportVisibility[layerId] = input.checked;
  toggleSingleTransportLayer(layerId, input.checked);
};

const buildTransportPanel = () => {
  const container = transportControl.getContainer();
  if(!container) return;
  const overlaysList = container.querySelector('.leaflet-control-layers-overlays');
  if(!overlaysList) return;
  const transportPanel = document.createElement('div');
  transportPanel.className = 'transport-group';
  transportPanel.setAttribute('role','group');
  transportPanel.setAttribute('aria-label','Слои транспорта');
  const title = document.createElement('div');
  title.className = 'transport-group__title';
  title.textContent = 'Легенда транспорта';
  transportPanel.appendChild(title);
  transportConfigs.forEach(cfg=>{
    transportVisibility[cfg.id] = true;
    const row = document.createElement('label');
    row.className = 'transport-layer-toggle';
    row.setAttribute('tabindex','0');
    row.setAttribute('aria-label',cfg.label);
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.dataset.layerId = cfg.id;
    checkbox.checked = true;
    checkbox.disabled = true;
    checkbox.className = 'transport-layer-toggle__checkbox';
    checkbox.classList.add('transport-layer-toggle__checkbox--disabled');
    checkbox.addEventListener('change',handleTransportLayerChange);
    transportCheckboxes[cfg.id] = checkbox;
    const legend = document.createElement('span');
    legend.className = `legend-icon ${cfg.legendClass}`;
    const text = document.createElement('span');
    text.className = 'transport-layer-toggle__label';
    text.textContent = cfg.label;
    row.appendChild(checkbox);
    row.appendChild(legend);
    row.appendChild(text);
    transportPanel.appendChild(row);
  });
  overlaysList.appendChild(transportPanel);
};

buildTransportPanel();

transportConfigs.forEach(cfg=>{
  const layer = createTransportLayer(cfg);
  transportLayers[cfg.id] = layer;
  loadTransportData(cfg)
    .then(data=>{
      layer.addData(data);
      if(cfg.geometry==='line' && typeof layer.bringToFront==='function'){
        layer.bringToFront();
      }
      if(transportState.master && transportVisibility[cfg.id]){
        transportGroup.addLayer(layer);
      }
    })
    .catch(err=>console.error(`Не удалось загрузить слой ${cfg.id}`,err));
});

const handleOverlayAdd = event => {
  if(event.name!==TRANSPORT_LABEL) return;
  setTransportMasterState(true);
};

const handleOverlayRemove = event => {
  if(event.name!==TRANSPORT_LABEL) return;
  setTransportMasterState(false);
};

map.on('overlayadd',handleOverlayAdd);
map.on('overlayremove',handleOverlayRemove);

/********** 4. кнопки зума **********/
const ZoomCtrl=L.Control.extend({
  onAdd(){
    const d=L.DomUtil.create('div','zoom-buttons');
    d.innerHTML='<button id="toA">▣ Участок 1</button><button id="toB">▣ Участок 2</button>';
    return d;
  }
});
map.addControl(new ZoomCtrl({position:'topleft'}));
document.getElementById('toA').onclick=()=>map.fitBounds(b1,{padding:[20,20]});
document.getElementById('toB').onclick=()=>map.fitBounds(b2,{padding:[20,20]});

/********** 5. категории маркеров **********/
const combo={
  buildings : L.layerGroup().addTo(map),
  landscape : L.layerGroup().addTo(map)
};
const icons={
  buildings : L.icon({iconUrl:'icons/marker-orange.png',
    shadowUrl:'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize:[25,41],iconAnchor:[12,41]}),
  landscape : L.icon({iconUrl:'icons/marker-violet.png',
    shadowUrl:'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize:[25,41],iconAnchor:[12,41]})
};

L.control.layers(
  null,
  {
    '<span class="legend-icon orange"></span> Объекты'      : combo.buildings,
    '<span class="legend-icon violet"></span> Благоустр.'  : combo.landscape
  },
  {collapsed:false, sanitize:false}
).addTo(map);

/********** 6. точки-объекты **********/
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
       const imgs=[p.img,p.img2,p.img3].filter(Boolean)
         .map(src=>`<img class="popup-img" src="${src}" style="cursor:zoom-in">`).join('<br>');
       const descr = p.descr ? `<div class="popup-text">${p.descr}</div>` : '';
       const tep=[];
       if(p.buildarea)  tep.push(`Площадь застройки — ${(+p.buildarea).toLocaleString('ru-RU')} м²`);
       if(p.grossarea)  tep.push(`Общая площадь — ${(+p.grossarea).toLocaleString('ru-RU')} м²`);
       if(p.usefularea) tep.push(`Полезная площадь — ${(+p.usefularea).toLocaleString('ru-RU')} м²`);
       if(p.roofarea)   tep.push(`Экспл. кровля — ${(+p.roofarea).toLocaleString('ru-RU')} м²`);
       if(p.invest)     tep.push(`Инвестиции — ${p.invest} млрд ₽`);
       if(p.implement)  tep.push(`Механизм реализации — ${p.implement}`);
       if(p.period)     tep.push(`Период строительства — ${p.period}`);
       const tepBlock = tep.length
         ? `<details class="popup-tep"><summary>ТЭП</summary><ul><li>${tep.join('</li><li>')}</li></ul></details>` : '';
       lyr.bindPopup(`${imgs}<div class="popup-title">${p.name||''}</div>${descr}${tepBlock}`);
       combo[(p.cat||'buildings').toLowerCase()].addLayer(lyr);
     }
   });
 });

/********** 7. лайтбокс **********/
function showLightbox(src){
 if(document.querySelector('.lb-overlay')) return;
 const w=document.createElement('div');
 w.className='lb-overlay';
 w.innerHTML=`<button class="lb-close">×</button><img src="${src}" alt="">`;
 document.body.appendChild(w);
 w.querySelector('.lb-close').onclick=()=>w.remove();
 w.onclick=e=>{if(e.target===w) w.remove();};
}
map.on('popupopen',e=>{
 e.popup._contentNode.querySelectorAll('.popup-img')
   .forEach(img=>img.addEventListener('click',()=>showLightbox(img.src),{once:true}));
});

/********** 8. бренд-ссылка **********/
const br=document.createElement('a');
br.className='brand-link';
br.href='https://t.me/neurourbanism_blog';
br.target='_blank';
br.textContent='Neurourbanism ©';
document.body.appendChild(br);


