# CLAUDE-opus.md

**이 파일은 Claude Opus 5를 사용할 때 적용되는 특화 가이드입니다.**

공통 가이드(Behavioral Guidelines, Commands, Folder Structure 등)는 [CLAUDE.md](CLAUDE.md)를 참고하세요.

참고: [Claude Opus 5 공식 프롬프팅 가이드](https://platform.claude.com/docs/ko/build-with-claude/prompt-engineering/prompting-claude-opus-5)

## 기능 개선 사항

Claude Opus 5는 이전 모델 대비 다음 영역에서 강화되었습니다:

- **에이전트 코딩**: 복잡한 멀티파일 기능, 대규모 리팩토링, 엔드투엔드 작업을 처음부터 끝까지 완성
- **코드 리뷰**: 높은 정밀도와 재현율로 실제 버그를 찾아냄. "심각도 높은 것만"이라는 지침은 모델이 덜 보고하게 함 — 모든 발견 후 필터링이 더 효과적
- **비전**: 차트, 다이어그램, UI 스크린샷 해석과 복제에서 대폭 향상
- **낮은 effort의 효율성**: `low`, `medium`에서도 강한 품질 유지. 기본값(`high`)에서 시작해 평가 후 조정 권장
- **긴 컨텍스트**: 1M 토큰 윈도우에서도 지시 따르기, 도구 호출, 추론 일관성 유지

## 응답 길이 제어

Opus 5의 기본 응답은 이전 모델보다 길다. **Effort는 "사고량"을 제어하며, 응답 길이를 제어하지 않습니다.** 짧은 응답을 원하면 명시적으로 지시하세요:

```
Keep responses focused, brief, and concise. Keep disclaimers and caveats short, and spend most of the response on the main answer. When asked to explain something, give a high-level summary unless an in-depth explanation is specifically requested.
```

긴 시스템 프롬프트에서는 끝에 짧은 리마인더를 추가하세요:

```
<tone_preference>
Keep outputs reasonably concise.
</tone_preference>
```

## 사용자 대상 진행 상황 업데이트

Opus 5는 에이전트 작업 중 적극적으로 내레이션합니다. 메시지당 출력이 이전 모델보다 깁니다. 원하는 빈도를 명시하세요:

```
Before your first tool call, say in one sentence what you're about to do. While working, give a brief update only when you find something important or change direction. When you finish, lead with the outcome: your first sentence should answer "what happened" or "what did you find," with supporting detail after it for readers who want it.
```

## 작업 범위와 과잉 검증 방지

Opus 5는 **명시적인 검증 지시가 없어도 자신의 작업을 검증합니다.** 다음 지시를 제거하세요:

- "사소하지 않은 모든 작업에 최종 검증 단계를 포함하세요"
- "서브에이전트를 사용하여 검증하세요"
- "답변을 다시 확인하세요"

이러한 지시는 **과잉 검증을 유발하여 비용만 증가**시킵니다.

범위가 좁은 작업에는 범위를 명시적으로 제한하세요:

```
Deliver what was asked, at the scope intended. Make routine judgment calls yourself, and check in only when different readings of the request would lead to materially different work. If the request seems mistaken or a better approach exists, say so in a sentence and continue with the task as asked rather than quietly narrowing, widening, or transforming it. Finish the whole task, and stop short of actions that are clearly beyond what was asked.
```

## 서브에이전트 생성 제어

Opus 5는 이전 모델보다 서브에이전트에 더 적극적으로 위임합니다. 작은 작업에 위임하면 비용과 시간이 배가됩니다. 명시적으로 제한하세요:

```
Delegate to a subagent only for large tasks that are genuinely independent and parallelizable, such as a wide multi-file investigation. Do not delegate work you can finish yourself in a handful of tool calls, and do not use subagents to verify or double-check your own work. If one subagent can complete the task, use one rather than several, and keep spawn counts low.
```

## 자체 수정 억제

Opus 5는 자신의 실수를 프롬프팅 없이도 발견하고 수정합니다. 다음 지시는 불필요하며 비용만 증가시킵니다:

- "답변을 다시 확인하세요"
- "응답하기 전에 재검증하세요"

또한 수정 내레이션을 중요한 것으로만 제한하세요:

```
Only correct an earlier statement when the error would change the user's code, conclusions, or decisions. State corrections plainly and briefly, then continue the task. For slips that change nothing for the user, make the fix and move on without noting it.
```

## 사고 비활성화 시 주의사항

Opus 5는 **기본적으로 사고가 활성화**되고, **사고 비활성화는 `high` effort 이하에서만 가능**합니다.

사고를 반드시 비활성화해야 하는 경우, 다음 두 가지 아티팩트가 나타날 수 있습니다:

1. **텍스트로 작성된 도구 호출**: 구조화된 `tool_use` 블록 대신 사용자 텍스트로 도구 호출을 쓰는 경우. 턴은 정상 완료되고 호출은 실행되지 않음
2. **내부 XML 태그 유출**: `<thinking>` 태그나 기타 내부 XML 태그가 가시적 응답에 나타남

**완화 방법**: 사고를 비활성화하는 대신 **사고를 활성화한 상태에서 낮은 effort로 비용 제어**가 대부분 더 나은 성능을 보입니다.

반드시 비활성화해야 하면 다음을 추가하세요:

```
When you use a tool, you may say a brief sentence first. If no tool can express what the user asked for, say so instead of guessing. Do not include internal or system XML tags in your response.
```
