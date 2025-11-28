
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
L.imageOverlay('images/Masterplan2.webp', b2,{opacity:.85})
]).addTo(map);
// видно при старте

const TRANSPORT_LABEL = 'Tранспорт';
const transportGroup = L.layerGroup();
const transportLayers = {};
const transportCheckboxes = {};
const transportVisibility = {};
const transportState = {master:false};
const mergeTolerance = 0.00015;

const cloneCoords = coords => coords.map(pair=>[pair[0],pair[1]]);

// --- ИСПРАВЛЕННАЯ ФУНКЦИЯ collectLineStringCoords ---
const collectLineStringCoords = featureCollection => {
    const coordsCollection = [];
    (featureCollection.features || []).forEach(feature => {
        const geometry = feature.geometry;
        if (!geometry) return; // Пропускаем фичи без геометрии

        if (geometry.type === 'LineString') {
            coordsCollection.push(cloneCoords(geometry.coordinates));
        } else if (geometry.type === 'MultiLineString') {
            geometry.coordinates.forEach(part => coordsCollection.push(cloneCoords(part)));
        }
    });
    return coordsCollection;
};
// --- КОНЕЦ ИСПРАВЛЕННОЙ ФУНКЦИИ ---

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
label: 'Сущ велодорожки',
legendClass:'scarlet-solid',
geometry:'line',
color: '#ff3b30',
weight:5,
mergeLines:true
},
{
id:'bikeProject',
sources:['data/bikeNew.geojson','data/bikeNew2.geojson'],
label: 'Проект велодорожки',
legendClass:'scarlet-dash',
geometry:'line',
color: '#ff3b30',
weight:5,
dashArray:'10 6',
mergeLines:true
},
{
id:'busstopDelete',
url:'data/busstopDelete.geojson',
label: 'Отмен остановки',
legendClass:'red',
geometry:'point',
color:'#ff4f4f',
radius:6
},
{
id:'busstopExist',
url:'data/busstopExist.geojson',
label: 'Сущ остановки',
legendClass:'pink',
geometry:'point',
color:'#ff6ec7',
radius:7
},
{
id:'busstopNew',
url:'data/busstopNew.geojson',
label: 'Проект остановки',
legendClass:'green',
geometry:'point',
color: '#2cc26d',
radius:7
},
{
id:'entrance',
url:'data/entrance.geojson',
label:'Въезды/выезды',
legendClass:'yellow',
geometry:'point',
color: '#f5c342',
radius:7
},
{
id:'railwayExist',
url:'data/railwayExist.geojson',
label: 'Сущ ж/д',
legendClass:'navy',
geometry:'point',
color: '#1b3a6f',
radius:8
},
{
id:'railwayProject',
url:'data/railwayNew.geojson',
label:'Проект ж/д',
legendClass:'sky',
geometry:'point',
color: '#5bd4ff',
radius:8
},
{
id:'parking',
url:'data/parking.geojson',
label: 'Паркинг',
legendClass:'gray',
geometry:'polygon',
color: '#8f8f8f',
fillOpacity:.5
},
{
id:'radius',
url:'data/radius.geojson',
label: 'Доступность остановок',
legendClass:'blue-outline',
geometry:'polygon',
color:'transparent',
fillColor: '#bfe6ff',
fillOpacity:.1,
weight:1,
opacity:0.45
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
input.classList.toggle('transport-layer-toggle___checkbox--disabled',!isEnabled);
});
if(isEnabled){
applyTransportVisibility();
} else {
transportGroup.clearLayers();
}
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
d.innerHTML='<button id="toA">■ Участок 1</button><button id="toB">■ Участок 2</button>';
return d;
}
});
map.addControl(new ZoomCtrl({position:'topleft'}));
document.getElementById('toA').onclick=()=>map.fitBounds(b1,{padding:[20,20]});
document.getElementById('toB').onclick=()=>map.fitBounds(b2,{padding:[20,20]});

/********** 5. категории маркеров **********/
const combo={
buildings: L.layerGroup().addTo(map),
landscape: L.layerGroup().addTo(map)
};
const icons={
buildings: L.icon({iconUrl:'icons/marker-orange.png',
shadowUrl:'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
iconSize: [25,41],iconAnchor:[12,41]}),
landscape: L.icon({iconUrl:'icons/marker-violet.png',
shadowUrl:'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
iconSize: [25,41],iconAnchor:[12,41]})
};
L.control.layers(
null,
{
'<span class="legend-icon orange"></span> Объекты' : combo.buildings,
'<span class="legend-icon violet"></span> Благоустр.' : combo.landscape
},
{collapsed:false, sanitize:false}
).addTo(map);

/********** 6. точки-объекты **********/

// =========================================================================================
// ВАЖНО: Замените эту ссылку на ту, которую вы получите после **ПОВТОРНОЙ ПУБЛИКАЦИИ**
// вашей Google Таблицы "MAP_EXPORT" в интернете как CSV-файл.
// Текущая ссылка выдает 404, что говорит о проблемах с публикацией на стороне Google.
const GOOGLE_SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vT4mENtARo9RXcrsAW0eTpzVFlwVG2S804TYEtvrt-rt-MxX8Qxz-aQE2ZGdu45_RIGHOgEAcRzCQ7A/pub?gid=569805773&single=true&output=csv'; // <--- ОБНОВИТЕ ЭТУ ССЫЛКУ!
// =========================================================================================

/**
 * Преобразует ссылку на Google Диск из формата "просмотр" в формат для отображения в img теге.
 * @param {string} viewLink - Ссылка на файл Google Диска в формате просмотра.
 * @returns {string} - Ссылка для прямого отображения файла в <img>.
 */
function getDisplayableDriveLink(viewLink) {
    if (!viewLink || typeof viewLink !== 'string') return '';
    const trimmedLink = viewLink.trim();
    if (trimmedLink === '') return '';

    // Регулярное выражение для извлечения FILE_ID из различных форматов Google Drive ссылок
    const fileIdMatch = trimmedLink.match(/(?:id=([a-zA-Z0-9_-]+)|file\/d\/([a-zA-Z0-9_-]+)|presentation\/d\/([a-zA-Z0-9_-]+)|[?&]id=([a-zA-Z0-9_-]+))/);

    let fileId = null;
    if (fileIdMatch) {
        fileId = fileIdMatch[1] || fileIdMatch[2] || fileIdMatch[3] || fileIdMatch[4];
    }

    if (fileId) {
        // ИСПРАВЛЕНО: Добавлен параметр export=download для обхода ограничений Google Диска
        return `https://drive.google.com/uc?export=download&id=${fileId}`; 
    }
    console.warn('Не удалось извлечь File ID из ссылки Google Drive. Возвращена исходная ссылка:', viewLink);
    return trimmedLink;
}

/**
 * Загружает CSV данные по URL и парсит их в массив объектов с помощью PapaParse.
 * @param {string} url - URL CSV файла.
 * @returns {Promise<Array<Object>>} - Промис, который разрешается массивом объектов.
 */
async function fetchAndParseCsv(url) {
    console.log(`[CSV Fetch] Attempting to fetch CSV from: ${url}`);
    try {
        const response = await fetch(url, {
            cache: 'no-store' // Попытка обойти возможные проблемы с кэшем
        });

        console.log(`[CSV Fetch] Fetch response for ${url}: status ${response.status}, ok: ${response.ok}`);

        if (!response.ok) {
            const errorBody = await response.text().catch(() => 'No response body available.');
            console.error(`[CSV Fetch] HTTP error details: Status ${response.status}, Body (first 200 chars): ${errorBody.substring(0, 200)}...`);
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const csvText = await response.text();
        console.log(`[CSV Fetch] Successfully fetched CSV text (first 200 chars): ${csvText.substring(0, 200)}...`);

        return new Promise((resolve, reject) => {
            Papa.parse(csvText, {
                header: true,
                dynamicTyping: true,
                skipEmptyLines: true,
                complete: function(results) {
                    console.log('[PapaParse] Parse complete. Data rows:', results.data.length);
                    if (results.errors.length) {
                        console.warn('[PapaParse] Errors during parsing:', results.errors);
                    }
                    const processedData = results.data.map(row => {
                        const newRow = {};
                        for (const key in row) {
                            let value = row[key];
                            if (typeof value === 'string') {
                                newRow[key] = value.trim();
                            } else {
                                newRow[key] = value;
                            }
                        }
                        return newRow;
                    });
                    console.log('[PapaParse] Processed data for GeoJSON conversion (first row):', processedData[0]);
                    resolve(processedData);
                },
                error: function(err) {
                    console.error('[PapaParse] Parsing error:', err);
                    reject(err);
                }
            });
    });
    } catch (error) {
        console.error('[CSV Fetch] Error during fetch operation:', error);
        throw error;
    }
}

/**
 * Преобразует массив объектов (из CSV) в формат GeoJSON FeatureCollection.
 * @param {Array<Object>} csvData - Массив объектов, полученных из CSV.
 * @returns {Object} - Объект GeoJSON FeatureCollection.
 */
function convertToGeoJSON(csvData) {
    const features = csvData.map(row => {
        const lat = parseFloat(row.lat);
        const lng = parseFloat(row.lng);

        if (isNaN(lat) || isNaN(lng)) {
            console.warn('Пропускаем строку из-за неверных координат (lat/lng):', row);
            return null;
        }

        const properties = { ...row };
        delete properties.lat;
        delete properties.lng;

        return {
            type: 'Feature',
            properties: properties,
            geometry: {
                type: 'Point',
                coordinates: [lng, lat]
            }
        };
    }).filter(Boolean);

    return {
        type: 'FeatureCollection',
        features: features
    };
}

// Вспомогательная функция для безопасного парсинга чисел, удаляющая общепринятые форматирования (например, пробелы)
// и заменяющая запятую на точку для правильного parseFloat.
const cleanAndParseNumber = (value) => {
    if (typeof value === 'string') {
        const cleanedValue = value.trim().replace(/\s/g, '').replace(/,/g, '.');
        const num = parseFloat(cleanedValue);
        return isNaN(num) ? null : num;
    }
    if (typeof value === 'number' && !isNaN(value)) {
        return value;
    }
    return null;
};


map.whenReady(()=>{
    fetchAndParseCsv(GOOGLE_SHEET_CSV_URL)
        .then(csvData => {
            console.log('[Main] Processed CSV Data:', csvData);
            if (!csvData || csvData.length === 0) {
                console.warn('[Main] Загруженные CSV данные пусты или некорректны. Маркеры не будут добавлены.');
                return;
            }

            const geojsonData = convertToGeoJSON(csvData);
            console.log('[Main] Converted GeoJSON Data:', geojsonData);

            if (!geojsonData || !geojsonData.features || geojsonData.features.length === 0) {
                console.warn('[Main] Преобразованные GeoJSON данные пусты или некорректны. Маркеры не будут добавлены.');
                return;
            }

            L.geoJSON(geojsonData,{
                pointToLayer:(f,ll)=>{
                    let cat=(f.properties.cat||'buildings').toLowerCase();
                    if(cat==='buldings') cat='buildings';
                    const icon = icons[cat] || icons.buildings;
                    return L.marker(ll,{icon:icon});
                },
                onEachFeature:(f,lyr)=>{
                    console.log('Processing feature:', f.properties.name, f.geometry.coordinates);
                    const p=f.properties||{};

                    const imgs = [p.img, p.img2, p.img3]
                        .filter(src => src && String(src).trim() !== '')
                        .map(src => `<img class="popup-img" src="${getDisplayableDriveLink(src)}" style="cursor:zoom-in">`)
                        .join('<br>');

                    const title = p.name ? `<div class="popup-title">${p.name}</div>` : '';
                    const description = p.descr ? `<div class="popup-text">${p.descr}</div>` : '';

                    const tep=[];
                    const buildarea = cleanAndParseNumber(p.buildarea);
                    const grossarea = cleanAndParseNumber(p.grossarea);
                    const usefularea = cleanAndParseNumber(p.usefularea);
                    const roofarea = cleanAndParseNumber(p.roofarea);
                    const invest = cleanAndParseNumber(p.invest);

                    if(buildarea !== null)  tep.push(`Площадь застройки — ${buildarea.toLocaleString('ru-RU')} м²`);
                    if(grossarea !== null)  tep.push(`Общая площадь — ${grossarea.toLocaleString('ru-RU')} м²`);
                    if(usefularea !== null) tep.push(`Полезная площадь — ${usefularea.toLocaleString('ru-RU')} м²`);
                    if(roofarea !== null)   tep.push(`Экспл. кровля — ${roofarea.toLocaleString('ru-RU')} м²`);
                    if(invest !== null)     tep.push(`Инвестиции — ${invest.toLocaleString('ru-RU', {minimumFractionDigits: 1, maximumFractionDigits: 1})} млрд ₽`);
                    if(p.implement && String(p.implement).trim() !== '')  tep.push(`Механизм реализации — ${p.implement}`);
                    if(p.period && String(p.period).trim() !== '')     tep.push(`Период строительства — ${p.period}`);

                    const tepBlock = tep.length
                        ? `<details class="popup-tep"><summary>ТЭП</summary><ul><li>${tep.join('</li><li>')}</li></ul></details>` : '';
                    
                    lyr.bindPopup(`${imgs}${title}${description}${tepBlock}`);

                    const targetCat = (p.cat || 'buildings').toLowerCase();
                    if (combo[targetCat]) {
                        combo[targetCat].addLayer(lyr);
                    } else {
                        console.warn(`Категория "${targetCat}" не найдена в группах combo. Добавляем в "buildings".`, p);
                        combo.buildings.addLayer(lyr);
                    }
                }
            });
        })
        .catch(error => {
            console.error('[Main] Ошибка при загрузке или обработке данных из Google Таблицы:', error);
            if (error.message.includes('404')) {
                console.error('[Main] Причина 404 ошибки: Вероятно, Google Таблица не опубликована в интернете как CSV, или ссылка устарела. Проверьте публикацию вкладки "MAP_EXPORT" и обновите GOOGLE_SHEET_CSV_URL.');
                console.error('[Main] Убедитесь, что вы очистили кэш браузера и GitHub Pages.');
            }
        });

    requestAnimationFrame(()=>{
        map.invalidateSize();
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
.forEach(img=>img.addEventListener('click',()=>showLightbox(img.src)));
});

/********** 8. бренд-ссылка **********/
const br=document.createElement('a');
br.className='brand-link';
br.href='https://t.me/neurourbanism_blog';
br.target='_blank';
br.textContent='Neurourbanism ©';
document.body.appendChild(br);
