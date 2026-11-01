"""Regression checks for the production image pipeline (requires Pillow)."""
import json, subprocess, sys, tempfile
from pathlib import Path
from PIL import Image

with tempfile.TemporaryDirectory() as folder:
    root=Path(folder)
    assets=root/'assets'
    assets.mkdir()
    Image.new('RGBA',(1800,1000),(255,0,0,80)).save(assets/'portrait.webp')
    Image.new('RGB',(1800,1000),'blue').save(assets/'portrait.jpg')
    Image.new('RGB',(160,100),'green').save(assets/'small.webp')
    Image.new('RGB',(600,400),'red').save(assets/'animated.webp',save_all=True,
        append_images=[Image.new('RGB',(600,400),'blue')],duration=100,loop=0)
    original={p.name:p.read_bytes() for p in assets.iterdir()}
    (root/'content.json').write_text(json.dumps({'media':{'./assets/'+name:{} for name in original}}))
    subprocess.run([sys.executable,'scripts/optimize-images.py',str(root)],check=True)
    media=json.loads((root/'content.json').read_text())['media']
    variants=media['./assets/portrait.webp']['srcset']
    assert [v['width'] for v in variants]==[480,800,1200,1600,1800]
    assert variants[-1]['src']=='./assets/portrait.webp'
    with Image.open(root/variants[0]['src']) as image:
        assert image.size==(480,267)
        assert image.getpixel((0,0))[3]==80
    assert media['./assets/portrait.jpg']['srcset'][0]['src']!=variants[0]['src']
    assert media['./assets/small.webp']['srcset']==[{'src':'./assets/small.webp','width':160}]
    assert 'srcset' not in media['./assets/animated.webp']
    for name,content in original.items(): assert (assets/name).read_bytes()==content
    print('PASS: WebP/JPEG variants, alpha, native size, animation, unique filenames, unchanged sources')
