export interface ValuationModelDescription {
  short: string;
  detail: string;
  caution: string;
}

export const VALUATION_MODEL_DESCRIPTIONS: Record<"NCAV" | "PBR" | "SRIM" | "DCF" | "PER" | "PEG", ValuationModelDescription> = {
  NCAV: {
    short: "빚을 갚고 남는 단기 자산을 봅니다.",
    detail: "유동자산에서 모든 부채를 빼고 주식 수로 나눕니다. 이 값을 1.0·1.2·1.5로 나눈 가격을 각각 비교합니다.",
    caution: "재고나 받을 돈이 장부에 적힌 금액대로 현금이 된다는 보장은 없습니다.",
  },
  PBR: {
    short: "회사의 순자산을 한 주 가격과 비교합니다.",
    detail: "한 주당 순자산(BPS)에 0.6·1.0·1.4배를 곱해 세 가지 가격을 계산합니다.",
    caution: "이 배수는 과거 주가에서 구한 값이 아니라 비교를 위해 정한 가정입니다.",
  },
  SRIM: {
    short: "자기자본으로 얼마나 이익을 내는지 봅니다.",
    detail: "회사의 자기자본에 자기자본이익률(ROE)을 투자자가 기대하는 수익률로 나눈 비율을 적용합니다. 기대 수익률 7.5·8.0·8.5%를 각각 비교합니다.",
    caution: "지금의 이익률이 계속되지 않으면 계산한 가치도 달라집니다.",
  },
  DCF: {
    short: "앞으로 벌 현금을 오늘 가치로 바꿉니다.",
    detail: "현재 영업현금흐름이 앞으로 5년간 늘어난다고 가정하고, 그 이후의 가치까지 오늘 돈의 가치로 환산합니다.",
    caution: "잉여현금흐름 대신 영업현금흐름을 쓰며, 성장률과 할인율 가정에 따라 결과가 크게 달라집니다.",
  },
  PER: {
    short: "한 주가 버는 이익에 정해 둔 배수를 곱합니다.",
    detail: "주당순이익(EPS)에 미리 정한 PER 배수를 곱해 여러 가격을 계산합니다.",
    caution: "올해 이익이 일시적으로 높거나 낮으면 계산한 가격도 흔들립니다.",
  },
  PEG: {
    short: "이익이 얼마나 늘지 가정해 가격을 봅니다.",
    detail: "주당순이익(EPS)에 성장률 가정과 PEG 배수를 곱해 세 가지 가격을 계산합니다.",
    caution: "실제 성장 전망을 읽어 오는 대신 연 15% 성장을 가정합니다.",
  },
};
