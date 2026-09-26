// Shared hospital floor plan — loaded by both dashboard.html (all vehicles)
// and device-detail.html (one vehicle). Room layout mirrors the reference
// "City Hospital First Floor Layout (20 Rooms)" image.

const HOSPITAL_ROOMS = [
  { id:'1',  label:'1 · General Ward',   type:'ward',        x:10,   y:10,  w:148, h:140 },
  { id:'2',  label:'2 · General Ward',   type:'ward',        x:163,  y:10,  w:148, h:140 },
  { id:'3',  label:'3 · General Ward',   type:'ward',        x:316,  y:10,  w:148, h:140 },
  { id:'4',  label:'4 · Consultation',   type:'consult',     x:469,  y:10,  w:148, h:140 },
  { id:'5',  label:'5 · Consultation',   type:'consult',     x:622,  y:10,  w:148, h:140 },
  { id:'6',  label:'6 · Pharmacy',       type:'pharmacy',    x:775,  y:10,  w:148, h:140 },
  { id:'7',  label:'7 · General Ward',   type:'ward',        x:928,  y:10,  w:148, h:140 },
  { id:'8',  label:'8 · General Ward',   type:'ward',        x:1081, y:10,  w:149, h:140 },

  { id:'20', label:'20 · Storage',       type:'storage',     x:10,   y:160, w:148, h:195 },
  { id:'19', label:'19 · Staff Room',    type:'staff',       x:10,   y:365, w:148, h:195 },

  { id:'stairs',      label:'Stairs',          type:'common', x:170, y:160, w:110, h:400 },
  { id:'elevator',    label:'Elevator',        type:'common', x:290, y:160, w:110, h:400 },
  { id:'male-wash',   label:'Male Washroom',   type:'wash',   x:410, y:160, w:110, h:195 },
  { id:'female-wash', label:'Female Washroom', type:'wash',   x:410, y:365, w:110, h:195 },
  { id:'waiting',     label:'Waiting Area',    type:'common', x:530, y:160, w:390, h:300 },
  { id:'reception',   label:'Reception',       type:'reception', x:530, y:470, w:390, h:90 },

  { id:'9',  label:'9 · Diagnostics (X-Ray/USG)', type:'diagnostics', x:930, y:160, w:149, h:195 },
  { id:'10', label:'10 · Equipment',              type:'storage',     x:930, y:365, w:149, h:195 },

  { id:'11', label:'11 · General Ward',  type:'ward',      x:10,   y:570, w:148, h:140 },
  { id:'12', label:'12 · General Ward',  type:'ward',      x:163,  y:570, w:148, h:140 },
  { id:'13', label:'13 · General Ward',  type:'ward',      x:316,  y:570, w:148, h:140 },
  { id:'14', label:'14 · Isolation',     type:'isolation', x:469,  y:570, w:148, h:140 },
  { id:'15', label:'15 · Consultation',  type:'consult',   x:622,  y:570, w:148, h:140 },
  { id:'16', label:'16 · Male Washroom', type:'wash',      x:775,  y:570, w:148, h:140 },
  { id:'17', label:'17 · General Ward',  type:'ward',      x:928,  y:570, w:148, h:140 },
  { id:'18', label:'18 · General Ward',  type:'ward',      x:1081, y:570, w:149, h:140 },

  { id:'entrance', label:'Main Entrance', type:'common', x:560, y:710, w:120, h:60 }
];

// Rooms a delivery actually makes sense at — used to populate the
// Pickup/Destination dropdowns (stairs/elevator/washrooms/entrance excluded).
const DELIVERY_ROOM_IDS = HOSPITAL_ROOMS
  .filter(r => !['common','wash'].includes(r.type))
  .map(r => r.id);

const ROOM_TYPE_COLOR = {
  ward:'#2c5f8a', consult:'#2f7a52', pharmacy:'#8a3a4a', diagnostics:'#5a4a8a',
  isolation:'#8a4a2c', wash:'#3a4a56', storage:'#7a6a2c', staff:'#2c6a6a',
  common:'#2a333a', reception:'#5a5a2c'
};

function roomById(id){ return HOSPITAL_ROOMS.find(r => r.id === id); }

function floorPlanRoomsSVG(){
  return HOSPITAL_ROOMS.map(r => `
    <g class="fp-room" data-room="${r.id}">
      <rect data-base-fill="${ROOM_TYPE_COLOR[r.type]}22" data-base-stroke="${ROOM_TYPE_COLOR[r.type]}"
        x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" rx="4"
        fill="${ROOM_TYPE_COLOR[r.type]}22" stroke="${ROOM_TYPE_COLOR[r.type]}" stroke-width="1"></rect>
      <text x="${r.x + r.w/2}" y="${r.y + r.h/2}" text-anchor="middle" dominant-baseline="middle"
        font-size="12" fill="#c7d0d5" style="pointer-events:none;">${r.label}</text>
    </g>`).join('');
}

function floorPlanMarkerSVG(device){
  const room = roomById(device.room);
  if(!room) return '';
  const cx = room.x + room.w / 2, cy = room.y + room.h / 2 - 20; // offset up slightly so it doesn't cover the label
  const color = device.online ? '#33d17a' : '#e4574c';
  const shortLabel = (device.shortLabel || device.id).toString().slice(-2);
  return `
    <g class="fp-marker" data-device-id="${device.id}" style="cursor:pointer;" transform="translate(${cx},${cy})">
      <circle r="15" fill="${color}" stroke="#0f1417" stroke-width="2.5"></circle>
      <text y="4" text-anchor="middle" font-size="10" font-weight="700" fill="#0b1116">${shortLabel}</text>
    </g>`;
}

// options: { devices: [{id, room, online, shortLabel}], highlightPickup, highlightDest, onMarkerClick }
function renderFloorPlan(svgEl, options = {}){
  const { devices = [], highlightPickup = null, highlightDest = null, onMarkerClick = null } = options;
  svgEl.setAttribute('viewBox', '0 0 1240 780');
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
      g.onclick = () => onMarkerClick(g.dataset.deviceId);
    });
  }
}

// Populates a <select> with the delivery-relevant rooms. Pass a current value to preselect.
function populateRoomSelect(selectEl, currentValue){
  selectEl.innerHTML = '<option value="">— none —</option>' + DELIVERY_ROOM_IDS.map(id => {
    const r = roomById(id);
    return `<option value="${id}" ${id === currentValue ? 'selected' : ''}>${r.label}</option>`;
  }).join('');
}
