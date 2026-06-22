import { readdirSync, readFileSync } from "node:fs";
import { parse } from "yaml";

const DIR = "src/content/projects";
const films = readdirSync(DIR).filter((f) => f.endsWith(".mdx")).map((f) => {
  const text = readFileSync(`${DIR}/${f}`, "utf-8");
  const data = parse(text.match(/^---\n([\s\S]*?)\n---/)[1]);
  return { slug: f.replace(/\.mdx$/, ""), order: data.card.order };
});
films.sort((a, b) => a.order - b.order);
films.forEach((f, i) => {
  const next = films[(i + 1) % films.length];
  console.log(`${f.order}. ${f.slug}  ->  next: ${next.slug}`);
});
