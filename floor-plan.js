// Shared hospital floor plan — loaded by both dashboard.html (all vehicles)
// and device-detail.html (one vehicle). Room + corridor layout mirrors the
// reference "City Hospital First Floor Layout (20 Rooms)" image.
// viewBox is fixed at 0 0 1240 900 across every page that uses this file.

const FLOORPLAN_VIEWBOX = { w: 1240, h: 900 };

const HOSPITAL_ROOMS = [
  // Top row
  { id:'1',  label:'1 · General Ward',  type:'ward',     x:10,   y:10, w:148, h:140 },
  { id:'2',  label:'2 · General Ward',  type:'ward',     x:163,  y:10, w:148, h:140 },
  { id:'3',  label:'3 · General Ward',  type:'ward',     x:316,  y:10, w:148, h:140 },
  { id:'4',  label:'4 · Consultation',  type:'consult',  x:469,  y:10, w:148, h:140 },
  { id:'5',  label:'5 · Consultation',  type:'consult',  x:622,  y:10, w:148, h:140 },
  { id:'6',  label:'6 · Pharmacy',      type:'pharmacy', x:775,  y:10, w:148, h:140 },
  { id:'7',  label:'7 · General Ward',  type:'ward',     x:928,  y:10, w:148, h:140 },
  { id:'8',  label:'8 · General Ward',  type:'ward',     x:1081, y:10, w:149, h:140 },

  // Top corridor — a real walkable passage, not just gap between rooms
  { id:'corridor-top', label:'Corridor', type:'corridor', x:10, y:150, w:1220, h:45 },

  // Middle block
  { id:'20', label:'20 · Storage',    type:'storage', x:10,  y:195, w:148, h:195 },
  { id:'19', label:'19 · Staff Room', type:'staff',   x:10,  y:400, w:148, h:195 },
  { id:'stairs',      label:'Stairs',          type:'common', x:170, y:195, w:110, h:400 },
  { id:'elevator',    label:'Elevator',        type:'common', x:290, y:195, w:110, h:400 },
  { id:'male-wash',   label:'Male Washroom',   type:'wash',   x:410, y:195, w:110, h:195 },
  { id:'female-wash', label:'Female Washroom', type:'wash',   x:410, y:400, w:110, h:195 },
  { id:'waiting',     label:'Waiting Area',    type:'common', x:530, y:195, w:390, h:300 },
  { id:'reception',   label:'Reception',       type:'reception', x:530, y:495, w:390, h:100 },
  { id:'9',  label:'9 · Diagnostics (X-Ray/USG)', type:'diagnostics', x:930, y:195, w:149, h:195 },
  { id:'10', label:'10 · Equipment',              type:'storage',     x:930, y:400, w:149, h:195 },

  // Bottom corridor
  { id:'corridor-bottom', label:'Corridor', type:'corridor', x:10, y:595, w:1220, h:45 },

  // Bottom row
  { id:'11', label:'11 · General Ward',  type:'ward',      x:10,   y:640, w:148, h:140 },
  { id:'12', label:'12 · General Ward',  type:'ward',      x:163,  y:640, w:148, h:140 },
  { id:'13', label:'13 · General Ward',  type:'ward',      x:316,  y:640, w:148, h:140 },
  { id:'14', label:'14 · Isolation',     type:'isolation', x:469,  y:640, w:148, h:140 },
  { id:'15', label:'15 · Consultation',  type:'consult',   x:622,  y:640, w:148, h:140 },
  { id:'16', label:'16 · Male Washroom', type:'wash',      x:775,  y:640, w:148, h:140 },
  { id:'17', label:'17 · General Ward',  type:'ward',      x:928,  y:640, w:148, h:140 },
  { id:'18', label:'18 · General Ward',  type:'ward',      x:1081, y:640, w:149, h:140 },

  // Entrance corridor + main entrance
  { id:'corridor-entrance', label:'Corridor', type:'corridor', x:560, y:780, w:120, h:60 },
  { id:'entrance', label:'Main Entrance', type:'common', x:560, y:840, w:120, h:60 }
];

// Rooms a delivery actually makes sense at — used for the Pickup/Destination
// dropdowns. Corridors, stairs, elevator, washrooms, entrance are excluded
// there (they're real, visible passages on the map, just not drop points).
const DELIVERY_ROOM_IDS = HOSPITAL_ROOMS
  .filter(r => !['common','wash','corridor'].includes(r.type))
  .map(r => r.id);

const ROOM_TYPE_COLOR = {
  ward:'#2c5f8a', consult:'#2f7a52', pharmacy:'#8a3a4a', diagnostics:'#5a4a8a',
  isolation:'#8a4a2c', wash:'#3a4a56', storage:'#7a6a2c', staff:'#2c6a6a',
  common:'#2a333a', reception:'#5a5a2c', corridor:'#1c2429'
};

function roomById(id){ return HOSPITAL_ROOMS.find(r => r.id === id); }

// Which room/corridor a raw (x,y) point falls inside, for a human-readable
// "near <room>" readout next to a freely-placed vehicle marker.
function roomAtPoint(x, y){
  return HOSPITAL_ROOMS.find(r => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) || null;
}

function floorPlanRoomsSVG(){
  return HOSPITAL_ROOMS.map(r => {
    const isCorridor = r.type === 'corridor';
    const labelSize = isCorridor ? 10 : 12;
    const labelOpacity = isCorridor ? 0.5 : 1;
    return `
    <g class="fp-room" data-room="${r.id}">
      <rect data-base-fill="${ROOM_TYPE_COLOR[r.type]}${isCorridor ? '' : '22'}" data-base-stroke="${ROOM_TYPE_COLOR[r.type]}"
        x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" rx="4"
        fill="${ROOM_TYPE_COLOR[r.type]}${isCorridor ? '' : '22'}" stroke="${ROOM_TYPE_COLOR[r.type]}" stroke-width="1"></rect>
      <text x="${r.x + r.w/2}" y="${r.y + r.h/2}" text-anchor="middle" dominant-baseline="middle"
        font-size="${labelSize}" fill="#c7d0d5" opacity="${labelOpacity}" style="pointer-events:none;">${r.label}</text>
    </g>`;
  }).join('');
}

// device: { id, x, y, online, shortLabel } — x/y are raw viewBox coordinates,
// so a vehicle can sit anywhere on the floor, room or corridor alike.
function floorPlanMarkerSVG(device){
  if(device.x == null || device.y == null) return '';
  const color = device.online ? '#33d17a' : '#e4574c';
  const shortLabel = (device.shortLabel || device.id).toString().slice(-2);
  return `
    <g class="fp-marker" data-device-id="${device.id}" style="cursor:pointer;" transform="translate(${device.x},${device.y})">
      <circle r="15" fill="${color}" stroke="#0f1417" stroke-width="2.5"></circle>
      <text y="4" text-anchor="middle" font-size="10" font-weight="700" fill="#0b1116">${shortLabel}</text>
    </g>`;
}

// options: { devices: [{id,x,y,online,shortLabel}], highlightPickup, highlightDest, onMarkerClick, onMapClick }
function renderFloorPlan(svgEl, options = {}){
  const { devices = [], highlightPickup = null, highlightDest = null, onMarkerClick = null, onMapClick = null } = options;
  svgEl.setAttribute('viewBox', `0 0 ${FLOORPLAN_VIEWBOX.w} ${FLOORPLAN_VIEWBOX.h}`);
  let html = floorPlanRoomsSVG();
  devices.forEach(d => { html += floorPlanMarkerSVG(d); });
  svgEl.innerHTML = html;

  if(highlightPickup){
    const rect = svgEl.querySelector(`.fp-room[data-room="${highlightPickup}"] rect`);
    if(rect){ rect.setAttribute('fill', '#33d17a40'); rect.setAttribute('stroke', '#33d17a'); rect.setAttribute('stroke-width','2'); }
  }
  if(highlightDest){
    const rect = svgEl.querySelector(`.fp-room[data-room="${highlightDest}"] rect`);
    if(rect){ rect.setAttribute('fill', '#4d8fe040'); rect.setAttribute('stroke', '#4d8fe0'); rect.setAttribute('stroke-width','2'); }
  }
  if(onMarkerClick){
    svgEl.querySelectorAll('.fp-marker').forEach(g => {
      g.onclick = (evt) => { evt.stopPropagation(); onMarkerClick(g.dataset.deviceId); };
    });
  }
  if(onMapClick){
    svgEl.onclick = (evt) => onMapClick(svgPointFromEvent(svgEl, evt));
  }
}

// Converts a mouse click on the SVG into viewBox coordinates, so clicking
// anywhere on the floor (room or corridor) gives an exact (x,y).
function svgPointFromEvent(svgEl, evt){
  const pt = svgEl.createSVGPoint();
  pt.x = evt.clientX; pt.y = evt.clientY;
  const ctm = svgEl.getScreenCTM().inverse();
  const transformed = pt.matrixTransform(ctm);
  return { x: Math.round(transformed.x), y: Math.round(transformed.y) };
}

// Populates a <select> with the delivery-relevant rooms only (used for Pickup/Destination).
function populateRoomSelect(selectEl, currentValue){
  selectEl.innerHTML = '<option value="">— none —</option>' + DELIVERY_ROOM_IDS.map(id => {
    const r = roomById(id);
    return `<option value="${id}" ${id === currentValue ? 'selected' : ''}>${r.label}</option>`;
  }).join('');
}
