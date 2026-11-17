import { writeFileSync } from 'fs'
import { exerciseIllustration } from '../src/three/illustration'
import { EXERCISES } from '../src/data/catalog'
const cells = EXERCISES.map((e) => `<div style="width:200px;display:inline-block;margin:4px;font:11px sans-serif;border:1px solid #ddd"><div style="height:166px">${exerciseIllustration(e.id)}</div>${e.id}</div>`)
writeFileSync('/tmp/illus.html', `<html><body style="margin:0;width:1700px"><style>svg{width:200px;height:166px}</style>${cells.join('')}</body></html>`)
