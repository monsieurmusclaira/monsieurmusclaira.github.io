// Local vocabulary checks, not a Google rich-result eligibility verdict.
// Provide the official schemaorg-current-https.jsonld vocabulary as argument 1.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
const vocabularyPath = process.argv[2];
if (!vocabularyPath) throw new Error('Provide a Schema.org JSON-LD vocabulary path.');
const vocabulary = JSON.parse(readFileSync(vocabularyPath, 'utf8'));
const terms = new Map(vocabulary['@graph'].map((term) => [term['@id'], term]));
const list = (value) => value === undefined ? [] : Array.isArray(value) ? value : [value];
const termId = (name) => name.startsWith('schema:') ? name : `schema:${name.replace(/^https?:\/\/schema.org\//, '')}`;
function ancestors(type, seen = new Set()) {
  const id = termId(type);
  if (seen.has(id)) return seen;
  seen.add(id);
  for (const parent of list(terms.get(id)?.['rdfs:subClassOf'])) ancestors(parent['@id'], seen);
  return seen;
}
function pages(folder) {
  return readdirSync(folder, { withFileTypes: true }).flatMap((entry) => entry.isDirectory() ? pages(join(folder, entry.name)) : entry.name.endsWith('.html') ? [join(folder, entry.name)] : []);
}
const errors = [];
let nodes = 0;
const paths = pages('dist');
for (const path of paths) {
  const blocks = [...readFileSync(path, 'utf8').matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  function visit(node) {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) { node.forEach(visit); return; }
    const types = list(node['@type']);
    if (types.length) nodes++;
    const parents = new Set(types.flatMap((type) => [...ancestors(type)]));
    for (const type of types) if (!terms.has(termId(type))) errors.push(`${path}: unknown type ${type}`);
    for (const [property, value] of Object.entries(node)) {
      if (property.startsWith('@')) continue;
      const definition = terms.get(termId(property));
      if (!definition) errors.push(`${path}: unknown property ${property}`);
      const domains = list(definition?.['schema:domainIncludes']).map((domain) => domain['@id']);
      if (types.length && domains.length && !domains.some((domain) => parents.has(domain))) errors.push(`${path}: ${property} is not supported on ${types.join(', ')}`);
      visit(value);
    }
  }
  blocks.forEach((block) => visit(JSON.parse(block[1])));
}
if (errors.length) throw new Error(errors.join('\n'));
console.log(`Validated ${nodes} typed nodes across ${paths.length} pages against official property/type/domain definitions.`);
