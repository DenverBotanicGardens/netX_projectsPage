// scripts/fetch_projects.js
// Node 18+ (has fetch built in)

import fs from "node:fs/promises";

const NETX_BASE_URL = process.env.NETX_BASE_URL;
const NETX_TOKEN = process.env.NETX_TOKEN; 
const FACET_FIELD = process.env.NETX_PROJECT_FIELD || "Project";
const FACET_SIZE = Number(process.env.NETX_FACET_SIZE || "1000");

if (!NETX_BASE_URL || !NETX_TOKEN) {
  console.error("Missing NETX_BASE_URL or NETX_TOKEN env vars.");
  process.exit(1);
}

const base = NETX_BASE_URL.replace(/\/$/, "");
const url = base.endsWith("/api/rpc") ? base : `${base}/api/rpc`;

const body = {
  query: "*",
  pageSize: 0,
  facets: [{ field: FACET_FIELD, size: FACET_SIZE }]
};

const res = await fetch(url, {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${NETX_TOKEN}`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify(body)
});

if (!res.ok) {
  const text = await res.text();
  console.error(`NetX error: ${res.status} ${res.statusText}\n${text}`);
  process.exit(1);
}

const json = await res.json();

await fs.mkdir("site", { recursive: true });
await fs.writeFile("site/debug_raw_response.json", JSON.stringify(json, null, 2), "utf8");
console.log("Facet keys returned:", json.facets ? Object.keys(json.facets) : []);


// DEBUG: write the full response so we can see facet structure
await fs.writeFile("site/debug_raw_response.json", JSON.stringify(json, null, 2), "utf8");

// DEBUG: show what keys NetX returned under facets
console.log("Facet keys returned:", json.facets ? Object.keys(json.facets) : []);


// Adjust this extractor if your NetX facet response shape differs
const facetBuckets =
  (json.facets && (json.facets[FACET_FIELD] || json.facets?.[FACET_FIELD])) ||
  json.facets?.[FACET_FIELD] ||
  [];

const projects = (facetBuckets || [])
  .map(x => ({ value: x.value ?? x.term ?? x.key ?? String(x), count: x.count ?? x.docCount ?? 0 }))
  .filter(x => x.value && x.value.trim().length > 0)
  .sort((a, b) => a.value.localeCompare(b.value, undefined, { sensitivity: "base" }));

const out = {
  updated_at: new Date().toISOString(),
  field: FACET_FIELD,
  projects
};

await fs.mkdir("site", { recursive: true });
await fs.writeFile("site/projects.json", JSON.stringify(out, null, 2), "utf8");

// Copy your static index.html into the publish dir
await fs.copyFile("index.html", "site/index.html");

console.log(`Wrote ${projects.length} projects.`);
