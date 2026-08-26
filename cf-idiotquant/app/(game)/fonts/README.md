# Galmuri 11 (부분집합)

게임 화면 전용 한글 픽셀 폰트. [quiple/galmuri](https://github.com/quiple/galmuri) v2.40.3 의
`dist/Galmuri11.woff2` · `dist/Galmuri11-Bold.woff2` 를 잘라낸 것이다.

라이선스는 SIL Open Font License 1.1 (`OFL.md`). 원본 그대로 재배포하는 것도,
잘라내어 쓰는 것도 허용된다 — 폰트 자체를 파는 것만 금지된다.

## 왜 잘라 썼나

원본은 20,965 자(한글 11,172 + 일본어 가나·한자 + 각종 기호)로 504KB 다. 이 앱은
한글과 라틴 문자만 쓰므로 CJK 한자와 가나를 덜어냈다.

| | 원본 | 여기 |
|---|---|---|
| Galmuri11 | 504KB / 20,965자 | **161KB** / 12,022자 |
| Galmuri11-Bold | 166KB / 12,695자 | **135KB** / 11,837자 |

한글 11,172 자(U+AC00–D7A3)는 **양쪽 모두 온전히 남아 있다**. 종목명·업종명은 서버에서
오는 값이라 실제로 쓰일 글자를 미리 알 수 없어, 한글은 한 자도 덜어내지 않았다.

## 다시 만들려면

```sh
npm pack galmuri@2.40.3 && tar xzf galmuri-2.40.3.tgz
pyftsubset package/dist/Galmuri11.woff2 \
  --unicodes="U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+2000-206F,U+20A9,U+20AC,U+2122,U+2190-21BB,U+2200-22FF,U+2500-257F,U+25A0-25FF,U+2600-26FF,U+3000-303F,U+1100-11FF,U+3130-318F,U+A960-A97F,U+AC00-D7A3,U+D7B0-D7FF,U+FF01-FF60" \
  --layout-features='*' --flavor=woff2 --output-file=Galmuri11.woff2
```

`app/(game)/layout.tsx` 에서만 불러오므로 다른 화면의 번들에는 들어가지 않는다.
