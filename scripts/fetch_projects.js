const fs = require("fs/promises");

const NETX_BASE_URL = process.env.NETX_BASE_URL;
const NETX_TOKEN = process.env.NETX_TOKEN;
const ATTRIBUTE_ID = 23;

const rpcUrl = `${NETX_BASE_URL.replace(/\/$/, "")}/api/rpc`;

async function rpcCall(method, params) {
  const res = await fetch(rpcUrl, {
    method: "POST",
    headers: {
      Authorization: `apiToken ${NETX_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: Date.now(),
      method,
      params
    })
  });

  const json = await res.json();
  if (json.error) {
    console.error(JSON.stringify(json.error, null, 2));
    process.exit(1);
  }
  return json.result;
}

(async () => {
  const result = await rpcCall("getValuesByAttribute", [
    ATTRIBUTE_ID,
    { page: { startIndex: 0, size: 5000 } }
  ]);

  const projects = (result.items || [])
    .map(v => ({
      value: v.value,
      count: v.count ?? 0
    }))
    .filter(p => p.value)
    .sort((a, b) =>
      a.value.localeCompare(b.value, undefined, { sensitivity: "base" })
    );

  await fs.mkdir("site", { recursive: true });

  await fs.writeFile(
    "site/debug_values_result.json",
    JSON.stringify(result, null, 2),
    "utf8"
  );
  console.log("Debug: wrote site/debug_values_result.json");

  await fs.writeFile(
    "site/projects.json",
    JSON.stringify(
      {
        updated_at: new Date().toISOString(),
        attribute_id: ATTRIBUTE_ID,
        projects
      },
      null,
      2
    ),
    "utf8"
  );

  await fs.copyFile("index.html", "site/index.html");

  console.log(`Wrote ${projects.length} Project values.`);
})();
