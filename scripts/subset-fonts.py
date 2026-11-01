"""Offline font subsetting. Repository text never leaves the machine."""
import json, os, re, sys
from pathlib import Path
if Path('.performance/python').exists():
    sys.path.insert(0, str(Path('.performance/python').resolve()))
from fontTools import subset
from fontTools.ttLib import TTFont

root = Path('.').resolve()
source = json.loads((root / 'content.json').read_text(encoding='utf-8'))
strings = []
def collect(value):
    if isinstance(value, str) and not value.startswith(('data:', 'http:', 'https:')):
        strings.append(value)
    elif isinstance(value, dict):
        for child in value.values(): collect(child)
    elif isinstance(value, list):
        for child in value: collect(child)
collect(source)
public_chars = set(''.join(strings))
ui_chars = set(''.join(p.read_text(encoding='utf-8') for p in root.glob('*.js')))
styles = []
for family, name, characters in [('Noto Sans SC', 'NotoSansSC', public_chars | ui_chars), ('Noto Serif SC', 'NotoSerifSC', public_chars)]:
    chars = {ord(c) for c in characters if 0x2E80 <= ord(c) <= 0xFFFF} | {0x3000,0x3001,0x3002}
    font = TTFont(root / '.performance/font-sources' / (name + '.ttf'), recalcTimestamp=False)
    options = subset.Options()
    options.flavor = 'woff2'
    options.layout_features = ['*']
    subsetter = subset.Subsetter(options=options)
    subsetter.populate(unicodes=chars)
    subsetter.subset(font)
    font.flavor = 'woff2'
    filename = name.lower() + '-local.woff2'
    output = root / 'assets/fonts' / filename
    font.save(output)
    rule = "@font-face{font-family:'%s';font-style:normal;font-weight:400 800;font-display:swap;src:url('./%s') format('woff2');unicode-range:U+2E80-FFFF}" % (family, filename)
    css_name = 'noto-sans-sc.css' if name == 'NotoSansSC' else 'noto-serif-sc.css'
    (root / 'assets/fonts' / css_name).write_text(rule, encoding='utf-8')
    if name == 'NotoSansSC': styles.append(rule)
    print(name, len(chars), 'characters;', output.stat().st_size, 'bytes')
inter = (root / 'assets/fonts/inter.css').read_text(encoding='utf-8')
(root / 'assets/fonts/fonts.css').write_text(inter + '\n' + '\n'.join(styles), encoding='utf-8')
# Keep the Inter Latin file and the newly generated fonts; old CJK fragments are unneeded.
keep = set(re.findall(r"url\(['\"]?\./([^)'\"]+)", inter))
for file in (root / 'assets/fonts').glob('*.woff2'):
    if re.fullmatch(r'[0-9a-f]{16}\.woff2', file.name) and file.name not in keep:
        file.unlink()
