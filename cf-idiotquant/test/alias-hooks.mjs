// tsconfig 의 `@/*` → 프로젝트 루트 별칭을 node --test 에게 알려준다.
//
// 이게 없으면 테스트할 수 있는 모듈이 "import 가 하나도 없는 파일"로 좁아진다.
// 실제로 스크리너 필터를 꺼내다가 filters → strategies → @/lib/utils/numbers 사슬에
// 걸렸고, 소스를 상대 경로로 비트는 대신 여기서 한 번 풀기로 했다.
//
// 노드는 확장자 없는 경로를 못 찾으므로 별칭을 푼 뒤 .ts / index.ts 를 붙여 본다.
// .tsx 는 일부러 찾지 않는다 — JSX 는 --experimental-strip-types 가 다루지 못해서,
// 화면 컴포넌트를 테스트에 끌어들이면 그 사실이 여기서 조용히 묻히지 않는 편이 낫다.

import { existsSync, statSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export async function resolve(specifier, context, nextResolve) {
    if (!specifier.startsWith("@/")) return nextResolve(specifier, context);

    const base = path.join(ROOT, specifier.slice(2));
    for (const candidate of [base, `${base}.ts`, path.join(base, "index.ts")]) {
        if (existsSync(candidate) && statSync(candidate).isFile()) {
            return { url: pathToFileURL(candidate).href, shortCircuit: true };
        }
    }

    return nextResolve(specifier, context);
}
