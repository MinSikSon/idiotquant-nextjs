import type { CalcMode } from "@/app/(calculator)/calculator/modes";

/** 저장해둔 계산 한 줄. inputs 는 워커가 건드리지 않고 그대로 돌려주는 JSON 문자열이다. */
export interface CalculatorRun {
    id: number;
    label: string | null;
    mode: CalcMode;
    inputs: string;
    final_value: number;        // 만원. 목표 나이에 남은 자산
    final_rate: number;         // %
    total_investment: number;   // 만원
    created_at: number;
}

export interface NewCalculatorRun {
    label?: string;
    mode: CalcMode;
    inputs: Record<string, unknown>;
    finalValue: number;
    finalRate: number;
    totalInvestment: number;
}

/* 가계부와 같은 이유로 본문을 텍스트로 먼저 받는다 — 워커가 오류 페이지를 주면
   res.json() 이 브라우저가 만든 파싱 오류를 던져, 무엇이 잘못됐는지 알 수 없다. */
async function calculatorRequest(subUrl: string, method = "GET", body?: object) {
    let res: Response;
    try {
        res = await fetch(`/api/proxy${subUrl}`, {
            method,
            credentials: "include",
            headers: { "content-type": "application/json" },
            ...(body ? { body: JSON.stringify(body) } : {}),
        });
    } catch {
        return { success: false, error: "서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요." };
    }

    const text = await res.text();
    try {
        return JSON.parse(text);
    } catch {
        return { success: false, error: `서버 응답을 읽지 못했습니다 (HTTP ${res.status}).` };
    }
}

export const getCalculatorRuns = () => calculatorRequest("/user/calculator");

export const addCalculatorRun = (run: NewCalculatorRun) =>
    calculatorRequest("/user/calculator", "POST", run);

// id 는 쿼리로 보낸다 — 프록시가 non-GET body 에 주문 필드를 병합하기 때문.
export const deleteCalculatorRun = (id: number) =>
    calculatorRequest(`/user/calculator?id=${id}`, "DELETE");
