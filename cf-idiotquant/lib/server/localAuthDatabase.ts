export function localAuthDatabase(url: string, token: string) {
    async function execute(sql: string, params: unknown[], operation: "first" | "run") {
        const response = await fetch(url, {
            method: "POST",
            headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
            body: JSON.stringify({ sql, params, operation }),
            cache: "no-store",
            redirect: "error",
        });
        if (!response.ok) throw new Error(`Local Auth.js D1 query failed (HTTP ${response.status})`);
        return response.json();
    }

    return {
        prepare(sql: string) {
            return {
                bind(...params: unknown[]) {
                    return {
                        first: () => execute(sql, params, "first"),
                        run: () => execute(sql, params, "run"),
                    };
                },
            };
        },
    };
}
