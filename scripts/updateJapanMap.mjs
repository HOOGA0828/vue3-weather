import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const SOURCE_URL = 'https://raw.githubusercontent.com/dataofjapan/land/master/japan.topojson';
const OUTPUT_URL = new URL('../public/japan.topojson', import.meta.url);

const response = await fetch(SOURCE_URL);
if (!response.ok) {
    throw new Error(`Failed to download Japan map: HTTP ${response.status}`);
}

const text = await response.text();
const topology = JSON.parse(text);

if (topology.type !== 'Topology' || !topology.objects || Object.keys(topology.objects).length === 0) {
    throw new Error('Downloaded file is not a valid TopoJSON topology.');
}

const outputPath = fileURLToPath(OUTPUT_URL);
await mkdir(new URL('../public/', import.meta.url), { recursive: true });
await writeFile(outputPath, text, 'utf8');

console.log(`Saved ${Buffer.byteLength(text, 'utf8').toLocaleString()} bytes to ${outputPath}`);
console.log(`Topology objects: ${Object.keys(topology.objects).join(', ')}`);
