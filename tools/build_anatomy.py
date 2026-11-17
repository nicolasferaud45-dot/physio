"""Convertit les maillages BodyParts3D (STL) en un paquet compact pour l'application.

Source : BodyParts3D, (c) The Database Center for Life Science, licence CC BY-SA 2.1 Japon.
Usage : python3 tools/build_anatomy.py <dossier stl> <liste id\tnom> <sortie .ts>
Repère de sortie : mètres, y vers le haut, z vers l'avant, côté droit du sujet en x négatif.
"""
import sys, json, base64, re
import numpy as np, trimesh, fast_simplification

stl_dir, list_file, out = sys.argv[1:4]
rows = [l.rstrip('\n').split('\t') for l in open(list_file) if l.strip()]

def cat_of(name):
    n = name.lower()
    if n == 'skin': return 'skin'
    if 'disk' in n: return 'disc'
    if 'tendon' in n or 'membrane' in n: return 'tendon'
    bone_kw = ['bone', 'femur', 'tibia', 'fibula', 'patella', 'humerus', 'radius', 'ulna', 'scapula', 'clavicle', 'sacrum', 'vertebra',
               'rib', 'sternum', 'talus', 'calcaneus', 'navicular', 'cuneiform', 'cuboid', 'metatarsal', 'metacarpal', 'phalanx', 'scaphoid',
               'lunate', 'triquetral', 'pisiform', 'trapezium', 'trapezoid', 'capitate', 'hamate', 'mandible', 'atlas', 'axis', 'manubrium', 'xiphoid', 'coccyx', 'sphenoid', 'maxilla']
    if any(re.search(r'\b' + k + r'\b', n) for k in bone_kw) or 'vertebra' in n: return 'bone'
    return 'muscle'

def target(name, cat):
    n = name.lower()
    if cat == 'skin': return 36000
    if cat == 'disc': return 260
    if cat == 'tendon': return 400
    if cat == 'bone':
        if 'phalanx' in n or 'metatarsal' in n or 'metacarpal' in n: return 160
        if any(k in n for k in ['scaphoid', 'lunate', 'triquetral', 'pisiform', 'trapez', 'capitate', 'hamate', 'cuneiform', 'cuboid', 'navicular']): return 220
        if 'rib' in n: return 500
        if 'vertebra' in n or n in ('atlas', 'axis'): return 1300
        if any(k in n for k in ['femur', 'tibia', 'humerus', 'hip bone', 'scapula', 'sacrum']): return 5000
        if 'patella' in n: return 900
        return 2200
    big = ['gluteus maximus', 'vastus', 'rectus femoris', 'adductor magnus', 'latissimus', 'pectoralis major', 'deltoid', 'trapezius', 'gastrocnemius', 'soleus', 'biceps femoris', 'semimembranosus', 'semitendinosus', 'external oblique', 'gluteus medius', 'triceps', 'iliocostalis', 'longissimus']
    return 2400 if any(k in n for k in big) else 1300

parts, chunks_v, chunks_i = [], [], []
voff = ioff = 0
for fid, name in rows:
    m = trimesh.load(f'{stl_dir}/{fid}.stl', process=True)
    m.merge_vertices()
    cat = cat_of(name)
    t = target(name, cat)
    v, f = np.asarray(m.vertices, dtype=np.float32), np.asarray(m.faces, dtype=np.int32)
    if len(f) > t:
        v, f = fast_simplification.simplify(v, f, target_reduction=1 - t / len(f))
    mm = trimesh.Trimesh(v, f, process=True); mm.remove_unreferenced_vertices()
    v = np.asarray(mm.vertices, dtype=np.float64); f = np.asarray(mm.faces, dtype=np.int64)
    if len(v) > 65535: raise SystemExit(f'trop de sommets {name}')
    # repère : (x, z, -y) / 1000
    v = np.stack([v[:, 0], v[:, 2], -v[:, 1]], axis=1) / 1000.0
    lo, hi = v.min(0), v.max(0)
    span = np.maximum(hi - lo, 1e-6)
    q = np.round((v - lo) / span * 65535).astype(np.uint16)
    chunks_v.append(q.tobytes()); chunks_i.append(f.astype(np.uint16).tobytes())
    parts.append({'id': fid, 'name': name, 'cat': cat, 'v': [voff, len(v)], 'i': [ioff, f.size], 'lo': [round(float(x), 5) for x in lo], 'span': [round(float(x), 5) for x in span]})
    voff += len(v); ioff += f.size
    print(f'{name:55s} {cat:7s} {len(f):6d} faces', file=sys.stderr)

vbuf = b''.join(chunks_v); ibuf = b''.join(chunks_i)
blob = vbuf + ibuf
meta = {'parts': parts, 'vBytes': len(vbuf), 'credit': 'BodyParts3D, © The Database Center for Life Science, CC BY-SA 2.1 Japon'}
with open(out, 'w') as fo:
    fo.write('// Généré par tools/build_anatomy.py — ne pas modifier à la main.\n')
    fo.write('// Modèles : BodyParts3D, (c) The Database Center for Life Science, licence CC BY-SA 2.1 Japon.\n')
    fo.write('export const ANATOMY_META = ' + json.dumps(meta, ensure_ascii=False, separators=(',', ':')) + '\n')
    fo.write('export const ANATOMY_DATA = "' + base64.b64encode(blob).decode() + '"\n')
print(f'{len(parts)} pièces, {voff} sommets, {ioff // 3} faces, {len(blob) / 1e6:.2f} Mo binaire', file=sys.stderr)
