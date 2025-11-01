// карта
const map = L.map('map').setView([55.7717, 37.5899], 17);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  {maxZoom:19, attribution:'© OSM'}
).addTo(map);

// оверлей-генплан
const bounds = [[55.743079,37.600941],[55.740674,37.603854]]; // NW & SE
L.imageOverlay('images/plan.png', bounds).addTo(map);

// кастом-иконка (можно стандартную)
const blueIcon = L.icon({
  iconUrl:'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
});

// точки
fetch('data/points.geojson')
  .then(r=>r.json())
  .then(json=>{
    L.geoJSON(json,{
      pointToLayer:(_, latlng)=>L.marker(latlng,{icon:blueIcon}),
      onEachFeature:(f, layer)=>{
        const p=f.properties;
        layer.bindPopup(
          `<b>${p.name}</b><br>
           <img class="popup-img" src="${p.img}"><br>
           ${p.descr}`
        );
      }
    }).addTo(map);
});
