"""Rebuild packaged production icons from pinned Mojang textures (network + Pillow).

This is a manual asset-generation tool. Normal addon builds use the checked-in
PNGs and do not download assets. Provenance is saved with source SHA256 values.
"""
import json,re,urllib.request,concurrent.futures,hashlib,io
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[1];ref=json.loads((root/'tools/reference/biome-production-1.26.40.json').read_text());ids=sorted(set(r['item'].split(':')[1] for r in ref['assignments']))
revision='15701fa9c13923f12662984c32c124327e40e3d3'
flat={'wheat':'wheat','potato':'potato','cocoa_beans':'dye_powder_brown','bamboo':'bamboo','honeycomb':'honeycomb','coal':'coal','iron_ingot':'iron_ingot','cod':'fish_raw','salmon':'fish_salmon_raw','prismarine_shard':'prismarine_shard','prismarine_crystals':'prismarine_crystals','sea_pickle':'sea_pickle','red_mushroom':'mushroom_red'}
blocks={'packed_ice':'ice_packed','stone':'stone','gravel':'gravel','sand':'sand','red_sand':'red_sand','hardened_clay':'hardened_clay','mud':'mud'}
logs={'oak_log':'log_oak','birch_log':'log_birch','dark_oak_log':'log_big_oak','spruce_log':'log_spruce','jungle_log':'log_jungle','acacia_log':'log_acacia'}
for wood in ['pale_oak','poplar','mangrove','cherry']:logs[wood+'_log']=wood+'_log_side'
records=[]
def download(path):
 url=f'https://raw.githubusercontent.com/Mojang/bedrock-samples/{revision}/resource_pack/{path}.png'
 data=urllib.request.urlopen(url,timeout=30).read();img=Image.open(io.BytesIO(data)).convert('RGBA');return img,{'path':path+'.png','sha256':hashlib.sha256(data).hexdigest()}
def make(item):
 if item in flat:
  img,src=download(('textures/blocks/' if item=='red_mushroom' else 'textures/items/')+flat[item]);return item,img,[src]
 side=logs.get(item,blocks.get(item));assert side,item
 top=side.replace('_side','_top') if side.endswith('_side') else side+'_top' if item in logs else side
 sideimg,src=download('textures/blocks/'+side)
 if top!=side:topimg,tsrc=download('textures/blocks/'+top);sources=[src,tsrc]
 else:topimg=sideimg;sources=[src]
 out=Image.new('RGBA',(32,34));faces=[((16,1),(15,8),(-15,8),topimg,1),((1,9),(15,8),(0,16),sideimg,.8),((16,17),(15,-8),(0,16),sideimg,.65)]
 for (ax,ay),(ux,uy),(vx,vy),tex,light in faces:
  det=ux*vy-uy*vx
  for y in range(34):
   for x in range(32):
    px=x+.5-ax;py=y+.5-ay;u=(px*vy-py*vx)/det;v=(ux*py-uy*px)/det
    if 0<=u<1 and 0<=v<1:
     rgba=tex.getpixel((min(tex.width-1,int(u*tex.width)),min(tex.height-1,int(v*tex.height))));out.putpixel((x,y),tuple(int(n*light) for n in rgba[:3])+(rgba[3],))
 return item,out,sources
outdir=root/'packs/resource/textures/ui/frontier/production';outdir.mkdir(exist_ok=True)
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
 for item,img,sources in pool.map(make,ids):
  img.save(outdir/(item+'.png'));records.append({'item':'minecraft:'+item,'icon':'textures/ui/frontier/production/'+item,'sources':sources})
(root/'docs/production-icon-assets.json').write_text(json.dumps({'source':'https://github.com/Mojang/bedrock-samples','revision':revision,'note':'Vanilla item textures; blocks rendered as compact isometric cubes with nearest-neighbor sampling. Mojang assets remain Mojang property.','items':records},indent=2)+'\n')
print('Packaged',len(records),'verified vanilla resource icons.')
