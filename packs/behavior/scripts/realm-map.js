// Shared, bounded biome exploration. Rendering never scans world columns.
export const MAP_COLS = 32, MAP_ROWS = 12, MAP_CELL = 16;
export const MAP_ZOOMS = [16, 32, 64, 128];
export const MAP_DIMENSIONS = ['minecraft:overworld','minecraft:nether','minecraft:the_end'];
const PREFIX = 'jagsby_frontier:biome_map_v1:';
const MAX_REGIONS = 1024;
export const MAP_COLORS = ['unknown','plains','forest','ocean','desert','mountains','snow','savanna','swamp','nether','other','current','settlement','player'];
const OFFSETS=[];
for(let z=-3;z<=3;z++)for(let x=-3;x<=3;x++)OFFSETS.push([x,z]);
OFFSETS.sort((a,b)=>a[0]*a[0]+a[1]*a[1]-b[0]*b[0]-b[1]*b[1]);
export function biomeCode(type) {
  if(!type)return 0;
  if(/nether|hell|crimson|warped|soul_sand|basalt/.test(type))return 9;
  if(/frozen|snow|ice|grove/.test(type))return 6;
  if(/ocean|river|beach/.test(type))return 3;
  if(/desert|badlands|mesa/.test(type))return 4;
  if(/swamp|mangrove/.test(type))return 8;
  if(/forest|taiga|jungle|cherry/.test(type))return 2;
  if(/savanna/.test(type))return 7;
  if(/mountain|peak|hill|windswept/.test(type))return 5;
  if(/plains|meadow/.test(type))return 1;
  return 10;
}
function address(dimension,x,z) {
  const rx=Math.floor(x/8),rz=Math.floor(z/8);
  return {key:`${dimension}:${rx}:${rz}`,slot:((z%8+8)%8)*8+(x%8+8)%8};
}
export function createSharedMap(world) {
  let index, dirtyIndex=false, scans=0, nextPlayer=0, capacity=false;
  const regions=new Map(),dirty=new Set(),recent=new Map(),cursors=new Map(),views=new Map();
  function initialize() {
    if(index)return;
    const raw=world.getDynamicProperty(PREFIX+'index');
    const parsed=raw===undefined?[]:JSON.parse(raw);
    if(!Array.isArray(parsed)||parsed.length>MAX_REGIONS||parsed.some(k=>typeof k!=='string'))throw Error('Shared map index is invalid');
    index=new Set(parsed);
  }
  function region(key,create=false) {
    initialize();
    if(regions.has(key))return regions.get(key);
    if(!index.has(key)) {
      if(!create)return null;
      const next=[...index,key];
      if(index.size>=MAX_REGIONS||JSON.stringify(next).length>26000){capacity=true;return null;}
      index.add(key);dirtyIndex=true;
    }
    const raw=world.getDynamicProperty(PREFIX+key);
    if(raw!==undefined&&(typeof raw!=='string'||raw.length!==64||!/^[A-K]{64}$/.test(raw)))throw Error('Shared map region is invalid');
    const data=(raw??'A'.repeat(64)).split('');regions.set(key,data);return data;
  }
  function read(dimension,x,z) {
    const a=address(dimension,x,z),r=region(a.key);
    return r?r[a.slot].charCodeAt(0)-65:0;
  }
  function observe(dimension,x,z,code) {
    if(!Number.isInteger(code)||code<1||code>10)return false;
    const a=address(dimension,x,z),r=region(a.key,true);
    if(!r)return false;
    const value=String.fromCharCode(65+code);
    if(r[a.slot]!==value){r[a.slot]=value;dirty.add(a.key);}
    return true;
  }
  function flush() {
    initialize();
    // Write regions before their index. Failed saves retain dirty state to retry.
    for(const key of dirty){world.setDynamicProperty(PREFIX+key,regions.get(key).join(''));dirty.delete(key);}
    if(dirtyIndex){world.setDynamicProperty(PREFIX+'index',JSON.stringify([...index]));dirtyIndex=false;}
  }
  function tick(players,now=Date.now()) {
    initialize();
    const online=new Set(players.map(p=>p.id));
    for(const id of cursors.keys())if(!online.has(id))cursors.delete(id);
    for(const key of views.keys())if(!online.has(key.split('|')[0]))views.delete(key);
    let reads=0,attempts=0;
    while(players.length&&reads<6&&attempts++<128) {
      const p=players[nextPlayer++%players.length];
      try {
        const cursor=cursors.get(p.id)??0;cursors.set(p.id,(cursor+1)%OFFSETS.length);
        const [dx,dz]=OFFSETS[cursor],x=Math.floor(p.location.x/16)+dx,z=Math.floor(p.location.z/16)+dz;
        const key=`${p.dimension.id}:${x}:${z}`;
        if(recent.has(key)&&now-recent.get(key)<60000)continue;
        recent.set(key,now);if(recent.size>4096)recent.delete(recent.keys().next().value);
        reads++;
        const biome=p.dimension.getBiome({x:x*16+8,y:64,z:z*16+8});
        // Missing/unloaded columns never erase an earlier discovery.
        if(biome)observe(p.dimension.id,x,z,biomeCode(biome.id));
      } catch { /* Unloaded columns are normal near exploration boundaries. */ }
    }
    if(++scans%10===0)flush();
    return reads;
  }
  function view(player,village,command) {
    const key=`${player.id}|${village.id}`;
    let v=views.get(key);
    if(!v||command==='center')v={x:Math.floor(village.location.x/16)*16,z:Math.floor(village.location.z/16)*16,zoom:0,dimension:village.dimension};
    const step=MAP_ZOOMS[v.zoom];
    if(command==='north')v.z-=step*4;if(command==='south')v.z+=step*4;
    if(command==='west')v.x-=step*4;if(command==='east')v.x+=step*4;
    if(command==='zoomIn')v.zoom=Math.max(0,v.zoom-1);
    if(command==='zoomOut')v.zoom=Math.min(MAP_ZOOMS.length-1,v.zoom+1);
    if(command==='dimension')v.dimension=MAP_DIMENSIONS[(MAP_DIMENSIONS.indexOf(v.dimension)+1)%3];
    views.set(key,v);if(views.size>128)views.delete(views.keys().next().value);
    return {...v};
  }
  function render(v,villages,player,currentId) {
    const step=MAP_ZOOMS[v.zoom],x0=v.x-MAP_COLS/2*step,z0=v.z-MAP_ROWS/2*step;
    const cells=[];
    for(let row=0;row<MAP_ROWS;row++)for(let col=0;col<MAP_COLS;col++) {
      // At distant zoom, pick the dominant known terrain; never query chunks.
      const counts=Array(11).fill(0);
      for(let z=0;z<step;z+=16)for(let x=0;x<step;x+=16){const c=read(v.dimension,Math.floor((x0+col*step+x)/16),Math.floor((z0+row*step+z)/16));if(c)counts[c]++;}
      let code=0;for(let i=1;i<counts.length;i++)if(counts[i]>counts[code])code=i;
      cells.push(MAP_COLORS[code]);
    }
    function mark(location,type) {
      const col=Math.floor((location.x-x0)/step),row=Math.floor((location.z-z0)/step);
      if(col>=0&&col<MAP_COLS&&row>=0&&row<MAP_ROWS)cells[row*MAP_COLS+col]=type;
    }
    for(const village of Object.values(villages))if(village.dimension===v.dimension&&village.id!==currentId)mark(village.location,'settlement');
    if(player.dimension?.id===v.dimension)mark(player.location,'player');
    const current=villages[currentId];if(current?.dimension===v.dimension)mark(current.location,'current');
    const rows=Array.from({length:MAP_ROWS},(_,r)=>cells.slice(r*MAP_COLS,(r+1)*MAP_COLS).map(c=>String.fromCharCode(0xE100+MAP_COLORS.indexOf(c))).join(''));
    return {cells,rows,info:`${v.dimension.replace('minecraft:','')} | ${v.x}, ${v.z} | ${step} blocks/tile${capacity?' | Storage full':''}`};
  }
  return {tick,flush,view,render,observe,read};
}
