import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  // 1. clsx로 조건부 클래스들을 정리하고
  // 2. twMerge로 중복된 Tailwind 클래스를 최종적으로 해결합니다.
  return twMerge(clsx(inputs));
}