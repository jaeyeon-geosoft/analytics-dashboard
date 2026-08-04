import type { ParsedFile } from "@/admin/lib/parse-file"

/** 열린 파일 그 자체에 대한 것. 파싱 결과(`ParsedFile`)와 달리 내용이 아니라 신원이다. */
export type Dataset = { name: string; size: number }

/**
 * 파일 하나를 여는 동안 화면이 거치는 상태. App이 들고 사이드바·캔버스가 함께 읽는다 —
 * 어느 한 컴포넌트의 것이 아니라서 여기 둔다.
 */
export type CanvasState =
  | { status: "empty" }
  | { status: "loading"; fileName: string }
  | { status: "error"; fileName?: string; message: string }
  | { status: "ready"; dataset: Dataset; data: ParsedFile }
