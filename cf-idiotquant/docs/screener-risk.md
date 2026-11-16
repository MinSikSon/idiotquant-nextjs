# 스크리너 위험 분류

판정은 `app/(screener)/screener/risk.ts`의 `screenerRisks`에서 수행한다.
`true`는 해당, `false`는 기준 비해당, `null`은 자료 부족이다.
제외 필터는 `true`만 제외하며 미확인 종목을 안전하다고 간주하지 않는다.

| 분류 | 앱에서 사용하는 기준 | 필요한 응답 필드 |
| --- | --- | --- |
| 중국 소재 소형주 | 미국 상장, 본사 중국 본토, 시총 3억 달러 미만 | `country`, `headquarters_country`, `market_cap` |
| 저유동성 | 일 거래대금 국내 3억원 / 미국 10만 달러 미만 | `country`, `acml_tr_pbmn` |
| 지속 현금 소진 | 최근 연속 3개 회계연도의 영업현금흐름 모두 음수 | `scan_date`, `operating_cash_flow_history` |

이 수치는 서비스의 선별 기준이며 거래소의 공식 위험 지정이 아니다.
소재지는 사업·지배구조 전체의 대리변수가 아니다. 케이맨·홍콩 등 본사 기업의
중국 사업 또는 중국계 지배 여부는 이 기준만으로 판정할 수 없다.
ADR·회사명으로 소재지를 추정하지 않는다. 거래대금은 하루 관측치이며 평균 거래량이 아니다.
현금 소진은 순이익 적자 또는 설비 투자에 따른 현금 감소와 구별한다.

## 백엔드 응답 계약과 현재 제한

현재 스크리너 백엔드는 본사 소재지와 연간 영업현금흐름 이력을 제공하지 않는다.
따라서 해당 두 분류는 **수집·응답 연결 전까지 미확인**이다. 저유동성은 기존 거래대금으로 동작한다.
프론트엔드에서는 조회된 응답의 다음 선택 필드를 사용한다.

```json
{
  "country": "US",
  "scan_date": "20261117",
  "headquarters_country": "CN",
  "market_cap": 100000000,
  "acml_tr_pbmn": 90000,
  "operating_cash_flow_history": [
    { "fiscal_year": 2025, "value": -10000000 },
    { "fiscal_year": 2024, "value": -8000000 },
    { "fiscal_year": 2023, "value": -9000000 }
  ]
}
```

`headquarters_country`는 본사 소재지 ISO 국가 코드이며 상장 시장인 `country`와 다르다.
`operating_cash_flow_history`는 원통화 기준 연간 값이다. 연도별 한 개의 최신 정정값을
제공해야 하며 누적 분기·TTM·단순 잔고 감소를 넣지 않는다.
최신 연도가 스캔 연도보다 미래이거나 2년보다 오래됐거나, 연속 3년 자료가 없으면 미확인이다.
과거 스캔에도 그 시점에 알려진 자료만 제공해야 한다.

URL의 `exclude`와 저장 조합은 `china-small`, `low-liquidity`, `cash-burn`을 사용한다.

현금흐름과 순이익의 차이 참고: [SEC 재무제표 안내](https://www.sec.gov/about/reports-publications/beginners-guide-financial-statements).
