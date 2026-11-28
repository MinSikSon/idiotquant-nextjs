import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { once } from "node:events";

const requireFrontend = createRequire(import.meta.url);
const { loadEnvConfig } = requireFrontend("@next/env");
loadEnvConfig(process.cwd(), true);

const workerRoot = resolve(process.env.LOCAL_WORKER_ROOT ?? "../../idiotquant-worker/idiotquant-backend");
const requireWorker = createRequire(join(workerRoot, "package.json"));
const { Miniflare } = requireWorker("miniflare");
const wrangler = requireWorker.resolve("wrangler/bin/wrangler.js");
const bundle = await mkdtemp(join(tmpdir(), "idiotquant-worker-"));
const signingKey = randomBytes(32).toString("hex");
const databaseToken = randomBytes(32).toString("hex");
let runtime;
let bridge;
let frontend;

try {
    const build = spawn(process.execPath, [wrangler, "deploy", "--dry-run", "--outdir", bundle], {
        cwd: workerRoot, stdio: "inherit", env: { ...process.env, WRANGLER_SEND_METRICS: "false" },
    });
    const [buildStatus] = await once(build, "exit");
    if (buildStatus !== 0) throw new Error("Local Worker build failed");

    runtime = new Miniflare({
        host: "127.0.0.1",
        port: 8787,
        scriptPath: join(bundle, "worker.js"),
        modules: true,
        modulesRoot: bundle,
        modulesRules: [{ type: "Text", include: ["**/*.sql"] }],
        compatibilityDate: "2024-11-11",
        bindings: { INTERNAL_JWT_SECRET: signingKey, ACCESS_CONTROL_ALLOW_ORIGIN: "http://localhost:3000", SCHEDULED_ON: false },
        d1Databases: ["D1_IDIOTQUANT_MAIN"],
        d1Persist: resolve(".wrangler/local-auth"),
        kvNamespaces: ["IQ", "IQ_TIMESTAMP", "IQ_PURCHASE_LOG"],
    });
    const db = await runtime.getD1Database("D1_IDIOTQUANT_MAIN");
    await db.prepare("CREATE TABLE IF NOT EXISTS local_schema_migrations (name TEXT PRIMARY KEY)").run();
    const migrations = [
        ["frontend-schema", "schema.sql"],
        ...["0004_stock_data_universal.sql", "0005_add_lstn_stcn.sql", "0008_ticker_name_overrides.sql", "0009_withdrawn_users.sql",
            "0013_stock_info.sql", "0014_risk_flags.sql", "0035_us_screener.sql"]
            .map(name => [name, join(workerRoot, "migrations", name)]),
    ];
    for (const [name, file] of migrations) {
        if (await db.prepare("SELECT name FROM local_schema_migrations WHERE name = ?").bind(name).first()) continue;
        const sql = await readFile(file, "utf8");
        const statements = sql.replace(/--.*$/gm, "").split(";").map(part => part.trim()).filter(Boolean);
        await db.batch([
            ...statements.map(statement => db.prepare(statement)),
            db.prepare("INSERT INTO local_schema_migrations (name) VALUES (?)").bind(name),
        ]);
    }

    bridge = createServer(async (request, response) => {
        if (request.method !== "POST" || request.url !== "/" ||
            request.headers.authorization !== `Bearer ${databaseToken}`) {
            response.writeHead(404).end();
            return;
        }

        try {
            const chunks = [];
            for await (const chunk of request) chunks.push(chunk);
            const { sql, params, operation } = JSON.parse(Buffer.concat(chunks).toString());
            if (operation !== "first" && operation !== "run") {
                response.writeHead(400).end();
                return;
            }
            const statement = db.prepare(sql).bind(...params);
            const result = operation === "first" ? await statement.first() : await statement.run();
            response.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify(result));
        } catch (error) {
            console.error("Local Auth.js D1 query failed:", error.message);
            response.writeHead(500).end();
        }
    });
    bridge.listen(0, "127.0.0.1");
    await once(bridge, "listening");

    frontend = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "--hostname", "127.0.0.1", "--port", "3000"], {
        stdio: "inherit",
        env: {
            ...process.env,
            AUTH_URL: "http://localhost:3000",
            AUTH_SECRET: randomBytes(32).toString("hex"),
            LOCAL_NEWSLETTER_MARKET_URL: process.env.LOCAL_NEWSLETTER_MARKET_URL || process.env.NEXT_PUBLIC_API_URL || "",
            NEXT_PUBLIC_API_URL: "http://127.0.0.1:8787",
            INTERNAL_JWT_SECRET: signingKey,
            LOCAL_AUTH_D1_URL: `http://127.0.0.1:${bridge.address().port}/`,
            LOCAL_AUTH_D1_TOKEN: databaseToken,
        },
    });
    const stop = () => frontend.kill("SIGTERM");
    process.once("SIGINT", stop);
    process.once("SIGTERM", stop);
    const [status] = await once(frontend, "exit");
    process.exitCode = status ?? 0;
} finally {
    bridge?.close();
    await runtime?.dispose();
    await rm(bundle, { recursive: true, force: true });
}
