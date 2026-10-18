# 미국 검색 티커 목록

시세 제공자인 한국투자증권의 [공식 해외주식 마스터](https://github.com/koreainvestment/open-trading-api/blob/main/stocks_info/overseas_stock_code.py)를 사용합니다.

- `nasdaq`: NAS (나스닥)
- `nyse`: NYS (뉴욕)
- `amex`: AMS (아멕스 시세 구분, NYSE Arca ETF 등도 포함)

마스터의 주식(2), ETP/ETF(3), 워런트(4)를 포함하고 지수(1)는 제외합니다. 거래소의 상장 목록과 증권사의 시세 지원 목록은 다를 수 있습니다. 검색 가능 여부가 모든 종목의 재무제표 제공을 뜻하지는 않습니다.

`*_tickers.json`은 검색·시세 분류용 티커 배열이며, `*_full_tickers.json`은 같은 목록의 `symbol`·영문명(`name`)·한글명(`koreanName`)입니다. 분석 페이지의 회사명 자동완성과 관리 화면에서 사용합니다. 회사명으로 검색해도 선택값은 티커를 전달합니다. 예전 Nasdaq 스크리너에서 가져온 가격·시가총액 등의 오래된 스냅샷은 저장하지 않습니다.

클래스주·우선주는 마스터 표기(`BRK/B`, `ABR/D`)를 유지합니다. 검색 입력은 대응하는 마스터 티커가 있을 때 `BRK.B`·`ABR^D`도 변환합니다.

## 갱신

```sh
npm run symbols:refresh
```

Python 3와 curl이 필요하며 별도 Python 패키지는 사용하지 않습니다. HTTPS 다운로드는 curl의 인증서 검증을 사용합니다. 세 마스터를 모두 검증한 후 티커·종목명 목록과 `metadata.json`을 함께 생성합니다. 메타데이터에는 원본 URL, ZIP 내부 마스터 파일의 수정 시각(원본 값, 시간대 미지정), SHA-256과 건수가 기록됩니다. 갱신 결과를 검토하고 커밋·배포해야 서비스 자동완성에 반영됩니다. 목록에 없는 신규 티커도 직접 입력해 조회할 수 있습니다.

다운로드한 ZIP으로 재생성하려면 다음과 같이 실행합니다.

```sh
npm run symbols:refresh -- --source-dir /path/to/masters
```

해당 폴더에 `nasmst.cod.zip`, `nysmst.cod.zip`, `amsmst.cod.zip`을 둡니다.
