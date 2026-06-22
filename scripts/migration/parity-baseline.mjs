import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const SRC = process.argv[2] || "src/pages/projects";
const OUT = "tests/fixtures/parity-baseline.json";

const count = (text, token) => (text.match(new RegExp(token, "g")) || []).length;

// Count string literals inside the FestivalList items={[ ... ]} array.
function festivalCount(text) {
  const m = text.match(/<FestivalList[^>]*items=\{\[([\s\S]*?)\]\}/);
  if (!m) return 0;
  return (m[1].match(/"(?:[^"\\]|\\.)*"/g) || []).length;
}

// Count items across all FestivalList blocks EXCEPT the first one.
function listsItemsTotal(text) {
  const allMatches = [...text.matchAll(/<FestivalList[^>]*items=\{\[([\s\S]*?)\]\}/g)];
  if (allMatches.length <= 1) return 0;
  let total = 0;
  for (let i = 1; i < allMatches.length; i++) {
    total += (allMatches[i][1].match(/"(?:[^"\\]|\\.)*"/g) || []).length;
  }
  return total;
}

// Count laurel images by occurrences of /laurels/ in the file.
function laurelCount(text) {
  return (text.match(/\/laurels\//g) || []).length;
}

function field(text, key) {
  // frontmatter line like:  title: "..."
  const m = text.match(new RegExp(`^${key}:\\s*"([\\s\\S]*?)"`, "m"));
  return m ? m[1] : null;
}

function metaField(text, key) {
  // meta export entry like:  heroImage: '...'
  const m = text.match(new RegExp(`${key}:\\s*['"]([\\s\\S]*?)['"]`));
  return m ? m[1] : null;
}

const result = {};
for (const file of readdirSync(SRC).filter((f) => f.endsWith(".mdx"))) {
  const slug = file.replace(/\.mdx$/, "");
  const text = readFileSync(join(SRC, file), "utf-8");
  result[slug] = {
    seoTitle: field(text, "title"),
    heroImage: metaField(text, "heroImage") || field(text, "image"),
    gallery: count(text, "<ContentPicture\\b"),
    credits: count(text, "<CreditsItem\\b"),
    awards: count(text, "<AwardItem\\b"),
    festivals: festivalCount(text),
    specs: count(text, "<SpecItem\\b"),
    featuredAward: count(text, "<FeaturedAward\\b") > 0,
    listsItemsTotal: listsItemsTotal(text),
    laurels: laurelCount(text),
  };
}

mkdirSync("tests/fixtures", { recursive: true });
writeFileSync(OUT, JSON.stringify(result, null, 2) + "\n");
console.log(`wrote ${OUT} for ${Object.keys(result).length} films`);
