# CLAUDE-fable.md

**이 파일은 Claude Fable 5를 사용할 때 적용되는 특화 가이드입니다.**

공통 가이드(Behavioral Guidelines, Commands, Folder Structure 등)는 [CLAUDE.md](CLAUDE.md)를 참고하세요.

참고: [Claude Fable 5 공식 프롬프팅 가이드](https://platform.claude.com/docs/ko/build-with-claude/prompt-engineering/prompting-claude-fable-5)

## 역량 향상 사항

Claude Fable 5는 이전 모델 대비 다음 영역에서 강화되었습니다:

- **장기 자율성**: 여러 날에 걸친 복잡한 작업도 지시 유지력 강함
- **첫 시도 정확성**: 이전엔 며칠 반복이 필요했던 시스템을 단일 패스로 구현
- **비전**: 밀도 높은 기술 이미지, 웹 애플리케이션, 스크린샷을 높은 정확도로 해석
- **엔터프라이즈 워크플로**: 지시 따르기, 범위 준수, 재무/스프레드시트/문서에서 전문가 수준 출력
- **코드 리뷰**: 버그 발견 재현율이 이전 모델보다 현저히 높음
- **위임 및 협업**: 병렬 서브에이전트와 장시간 실행 워크플로 안정적 관리

## 기본적으로 더 긴 턴

어려운 작업은 개별 요청에서 몇 분, 자율 실행은 몇 시간까지 걸릴 수 있습니다. 마이그레이션 전에 다음을 준비하세요:

- **타임아웃 조정**: 클라이언트 타임아웃, 스트리밍, UI 진행 표시기 업데이트
- **비동기 처리**: 블로킹 대신 예약된 작업으로 실행 확인
- **과잉 계획 억제**: 모호한 작업에서 과도한 계획을 피하세요

```
When you have enough information to act, act. Do not re-derive facts already established in the conversation, re-litigate a decision the user has already made, or narrate options you will not pursue in user-facing messages. If you are weighing a choice, give a recommendation, not an exhaustive survey. This does not apply to thinking blocks.
```

## Effort 적절히 선택하기

Effort는 지능, 지연 시간, 비용의 주요 트레이드오프 제어 수단입니다:

- **`high`**: 대부분 작업의 기본값
- **`xhigh`**: 가장 어려운 작업 (복잡한 아키텍처, 다중 도메인 코딩)
- **`medium`/`low`**: 일상 작업. Fable 5의 낮은 effort도 이전 모델 `xhigh`를 능가

더 높은 effort에서 일상적 작업을 수행하면 필요 이상으로 컨텍스트를 수집할 수 있습니다. 요청하지 않은 리팩토링을 방지하세요:

```
Don't add features, refactor, or introduce abstractions beyond what the task requires. A bug fix doesn't need surrounding cleanup and a one-shot operation usually doesn't need a helper. Don't design for hypothetical future requirements: do the simplest thing that works well. Avoid premature abstraction and half-finished implementations. Don't add error handling, fallbacks, or validation for scenarios that cannot happen. Trust internal code and framework guarantees. Only validate at system boundaries (user input, external APIs).
```

## 강력한 지시 따르기

각 패턴을 나열하지 말고 간단한 지시로 조정하세요. 예를 들어, 무조건 짧게 하려면:

```
Lead with the outcome. Your first sentence after finishing should answer "what happened" or "what did you find": the thing the user would ask for if they said "just give me the TLDR." Supporting detail and reasoning come after. Being readable and being concise are different things, and readability matters more.

The way to keep output short is to be selective about what you include (drop details that don't change what the reader would do next), not to compress the writing into fragments, abbreviations, or arrow chains.
```

장시간 워크플로에서만 멈추도록:

```
Pause for the user only when the work genuinely requires them: a destructive or irreversible action, a real scope change, or input that only they can provide. If you hit one of these, ask and end the turn, rather than ending on a promise.
```

## 진행 상황 근거 확보 (장시간 실행)

장시간 자율 실행에서는 도구 결과에 대해 진행 상황을 감사하세요:

```
Before reporting progress, audit each claim against a tool result from this session. Only report work you can point to evidence for; if something is not yet verified, say so explicitly. Report outcomes faithfully: if tests fail, say so with the output; if a step was skipped, say that; when something is done and verified, state it plainly without hedging.
```

## 경계 명시 (요청하지 않은 작업 방지)

Fable 5는 때때로 요청하지 않은 이메일 초안, 방어적 git 브랜치 백업 등을 수행합니다:

```
When the user is describing a problem, asking a question, or thinking out loud rather than requesting a change, the deliverable is your assessment. Report your findings and stop. Don't apply a fix until they ask for one. Before running a command that changes system state (restarts, deletes, config edits), check that the evidence actually supports that specific action. A signal that pattern-matches to a known failure may have a different cause.
```

이 저장소의 [PR 생성 규칙](CLAUDE.md#pr-생성-규칙)을 벗어나는 방어적 브랜치·커밋을 임의로 만들지 않습니다.

## 병렬 서브에이전트

Fable 5는 병렬 서브에이전트를 쉽게 디스패치합니다. 위임이 적절한 시점을 명시하고 비동기 커뮤니케이션을 선호하세요:

```
Delegate independent subtasks to subagents and keep working while they run. Intervene if a subagent goes off track or is missing relevant context.
```

캐시 읽기를 활용한 장수명 서브에이전트가 시간과 비용을 절약합니다.

## 메모리 시스템 구축

Fable 5는 과거 교훈을 기록·참조할 때 특히 잘 수행합니다. 이 저장소의 `memory/` 시스템(MEMORY.md 인덱스)을 활용하세요:

```
Store one lesson per file with a one-line summary at the top. Record corrections and confirmed approaches alike, including why they mattered. Don't save what the repo or chat history already records; update an existing note rather than creating a duplicate; delete notes that turn out to be wrong.
```

## 요청의 "이유"도 제공

Fable 5는 의도를 알 때 더 잘 수행합니다:

```
I'm working on [the larger task] for [who it's for]. They need [what the output enables]. With that in mind: [request].
```

## 사용자 커뮤니케이션 가독성

긴 에이전트 작업 후 최종 요약을 작성할 때는 사용자가 처음 읽는다고 가정하세요:

```
When you write the summary at the end, drop the working shorthand. Write complete sentences. Spell out terms. Don't use arrow chains, hyphen-stacked compounds, or labels you made up earlier. When you mention files, commits, flags, or other identifiers, give each one its own plain-language clause. Open with the outcome: one sentence on what happened or what you found. Then the supporting detail.
```

## 스캐폴딩 검토 및 제거

Fable 5는 이전 모델용으로 만든 규범적 지침이 오히려 품질을 저하시킬 수 있습니다. 마이그레이션 시 다음을 검토하세요:

- **내부 추론 표현 금지**: 응답에서 사고 과정을 "반복·전사하도록" 하는 지시는 `reasoning_extraction` 거부를 트리거해 Opus 폴백 증가
- **필요 이상 구체적인 검증 지시**: 이전 모델의 "검증 단계 추가" 같은 지시 제거 (Fable 5는 자동)
- **오래된 도구 래퍼**: 이전 모델 회피책을 재검증하세요 (예: 비전 성능 향상으로 우회책이 불필요할 수 있음)
