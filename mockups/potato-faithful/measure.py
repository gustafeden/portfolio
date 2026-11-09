import gzip
import json
import os
from pathlib import Path

root = Path(__file__).resolve().parent
original = root / 'verification' / 'original'

def size(files):
    values = [f.read_bytes() for f in files]
    return {'files': len(values), 'raw': sum(map(len, values)),
            'gzip': sum(len(gzip.compress(v, compresslevel=9, mtime=0)) for v in values)}

report = {}
directories = [('original', original), ('clone', root / 'dist')]
if os.environ.get('BASELINE_DIR'):
    directories.insert(1, ('before_cleanup', Path(os.environ['BASELINE_DIR']) / 'runtime'))
for name, directory in directories:
    files = [f for f in directory.rglob('*') if f.is_file()
             and 'verification' not in f.relative_to(directory).parts
             and f.suffix not in ('.py', '.cjs', '.md')]
    report[name] = {
        'all_static': size(files),
        'html_css_js': size([f for f in files if f.suffix in ('.html', '.css', '.js')]),
        'fx_js': size([directory / 'fx.js']),
        'site_js': size([directory / 'site.js']),
        'runtime_js_css': size([f for f in files if f.suffix in ('.css', '.js')]),
        'fx_js_css': size([directory / 'fx.js'] + ([directory / 'fx.css'] if (directory / 'fx.css').exists() else [])),
        'grain': size([directory / 'assets/gold200-grain.png']) if name == 'original' else size([])
    }
assert (root / 'site.css').read_bytes() == (original / 'site.css').read_bytes()
assert (root / 'photos.js').read_bytes() == (original / 'photos.js').read_bytes()
assert (root / 'stats.js').read_bytes() == (original / 'stats.js').read_bytes()
(root / 'verification' / 'generated').mkdir(parents=True, exist_ok=True)
(root / 'verification' / 'generated' / 'sizes.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps(report, indent=2))
