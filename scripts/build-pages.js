import {cp, mkdir, readFile, writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';

const root = new URL('../', import.meta.url);
const output = new URL('../_site/', import.meta.url);
const snapshot = JSON.parse(await readFile(new URL('data/source-data.json', root), 'utf8'));
if (snapshot.schemaVersion !== 1 || !snapshot.races) throw new Error('Invalid source snapshot');
await mkdir(output, {recursive: true});
await cp(new URL('public/', root), output, {recursive: true});
await cp(new URL('data/', root), new URL('data/', output), {recursive: true});
await writeFile(new URL('.nojekyll', output), '');
console.log('Static website built at ' + fileURLToPath(output));
