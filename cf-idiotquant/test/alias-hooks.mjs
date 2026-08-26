// 소스가 쓰는 import 모양을 node --test 에게 알려준다.
//
// 이게 없으면 테스트할 수 있는 모듈이 "import 가 하나도 없는 파일"로 좁아진다.
// 실제로 스크리너 필터를 꺼내다가 filters → strategies → @/lib/utils/numbers 사슬에
// 걸렸고, 소스를 상대 경로로 비트는 대신 여기서 한 번 풀기로 했다.
//
// 푸는 것은 두 가지다.
//   1. tsconfig 의 `@/*` → 프로젝트 루트 별칭
//   2. 확장자 없는 상대 경로(`./engine`) — 소스끼리 서로 부를 때 쓰는 모양이다.
//      번들러는 알아서 찾지만 노드는 못 찾는다. 여기서 안 풀면 `./engine.ts` 처럼
//      테스트를 위해서만 존재하는 표기가 소스에 섞인다.
//
// 어느 쪽이든 .ts / index.ts 만 찾는다. .tsx 는 일부러 찾지 않는다 — JSX 는
// --experimental-strip-types 가 다루지 못해서, 화면 컴포넌트를 테스트에 끌어들이면
// 그 사실이 여기서 조용히 묻히지 않는 편이 낫다.

import { existsSync, statSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** 확장자를 붙여 가며 실제 파일을 찾는다. 없으면 null. */
function pick(base) {
    for (const candidate of [base, `${base}.ts`, path.join(base, "index.ts")]) {
        if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
    }
    return null;
}

export async function resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
        const found = pick(path.join(ROOT, specifier.slice(2)));
        if (found) return { url: pathToFileURL(found).href, shortCircuit: true };
        return nextResolve(specifier, context);
    }

    // 상대 경로는 우리 소스에서 온 것만 푼다. node_modules 안의 해석 규칙은
    // 그 패키지의 것이라 손대지 않는다.
    const parent = context.parentURL;
    if (specifier.startsWith(".") && parent?.startsWith("file:") && !parent.includes("/node_modules/")) {
        const found = pick(path.resolve(path.dirname(fileURLToPath(parent)), specifier));
        if (found) return { url: pathToFileURL(found).href, shortCircuit: true };
    }

    return nextResolve(specifier, context);
}
