// 금융·공통 컨트롤의 키보드 포커스와 비활성 상태.
export const CONTROL_FOCUS_CLS =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-ink";

export const CONTROL_DISABLED_CLS =
  "disabled:opacity-50 disabled:cursor-not-allowed";

// 입력 경계는 기본 상태에서도 구분되고, placeholder는 일반 텍스트 대비를 따른다.
export const CONTROL_INPUT_CLS =
  "min-h-11 rounded-xl border border-neutral-500 dark:border-neutral-500 placeholder:text-neutral-600 dark:placeholder:text-neutral-400 " +
  CONTROL_FOCUS_CLS;

export const CONTROL_ICON_BUTTON_CLS =
  "inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200/60 dark:hover:bg-surface-dark-muted/60 transition-colors " +
  CONTROL_FOCUS_CLS + " " + CONTROL_DISABLED_CLS;
