import { apiRequest } from "../apiRequest";
import type { Detail } from "@/app/(calculator)/calculator/calc";

/** 저장해둔 계산 한 줄. inputs 는 워커가 건드리지 않고 그대로 돌려주는 JSON 문자열이다. */
export interface CalculatorRun {
    id: number;
    label: string | null;
    mode: Detail;
    inputs: string;
    final_value: number;        // 만원. 만기 평가금액
    final_rate: number;         // %
    total_investment: number;   // 만원
    created_at: number;
}

export interface NewCalculatorRun {
    label?: string;
    mode: Detail;
    inputs: Record<string, unknown>;
    finalValue: number;
    finalRate: number;
    totalInvestment: number;
}

/* 응답이 JSON 이 아닐 때의 처리는 lib/features/apiRequest.ts 한 곳에 있다. */
const calculatorRequest = (subUrl: string, method = "GET", body?: object) =>
    apiRequest(subUrl, { method, body });

export const getCalculatorRuns = () => calculatorRequest("/user/calculator");

export const addCalculatorRun = (run: NewCalculatorRun) =>
    calculatorRequest("/user/calculator", "POST", run);

// id 는 쿼리로 보낸다 — 프록시가 non-GET body 에 주문 필드를 병합하기 때문.
export const deleteCalculatorRun = (id: number) =>
    calculatorRequest(`/user/calculator?id=${id}`, "DELETE");
