"""Create responsive WebP assets in the build output; never alter source images."""
import json, sys
from pathlib import Path
from PIL import Image, ImageOps
root = Path(sys.argv[1] if len(sys.argv)>1 else 'dist').resolve()
file = root/'content.json'
data = json.loads(file.read_text(encoding='utf-8'))
for url, info in list(data.get('media', {}).items()):
    if not url.startswith('./assets/') or not url.lower().endswith(('.jpg','.jpeg','.png','.webp')): continue
    source=(root/url).resolve()
    if not source.is_relative_to(root): continue
    with Image.open(source) as original:
        if original.width*original.height>40000000: continue
        # Preserve animation and transparent backgrounds.
        if getattr(original, 'is_animated', False): continue
        image=ImageOps.exif_transpose(original)
        image=image.convert('RGBA' if 'A' in image.getbands() or 'transparency' in image.info else 'RGB')
        info.update(width=image.width, height=image.height)
        variants=[]
        for width in sorted(set(min(w,image.width) for w in [480,800,1200,1600,2400])):
            # Reuse native size rather than repeatedly recompressing it.
            if width==image.width:
                variants.append({'src':url,'width':width})
                continue
            height=round(image.height*width/image.width)
            target=source.with_name(source.stem+'-'+source.suffix[1:].lower()+'-'+str(width)+'.webp')
            image.resize((width,height),Image.Resampling.LANCZOS).save(target,'WEBP',quality=82,method=6)
            generated='./'+target.relative_to(root).as_posix()
            data['media'][generated]={'width':width,'height':height,'bytes':target.stat().st_size}
            variants.append({'src':generated,'width':width})
        if variants: info['srcset']=variants
        print(source.name, '->', ', '.join(str(v['width'])+'px' for v in variants))
file.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
