// KIS는 법인세를 별도 제공하지 않아 특별손익까지 반영한 세전손익과
// 당기순이익의 차액을 표시한다. 공시 법인세비용과 같은 값으로 단정하지 않는다.
export function krIncomeValue(row: Record<string, unknown>, key: string): number | null {
    const at = (field: string): number | null => {
        const raw = row[field];
        if (raw === null || raw === undefined || raw === "") return null;
        const value = Number(raw);
        return Number.isFinite(value) ? value : null;
    };
    if (key !== "pretax_income" && key !== "tax_difference") return at(key);
    const ordinary = at("op_prfi");
    const specialProfit = at("spec_prfi");
    const specialLoss = at("spec_loss");
    if (ordinary === null || specialProfit === null || specialLoss === null) return null;
    const pretax = ordinary + specialProfit - specialLoss;
    if (key === "pretax_income") return pretax;
    const net = at("thtr_ntin");
    return net === null ? null : pretax - net;
}
