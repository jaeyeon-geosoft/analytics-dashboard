import type { AdminDataset } from "@/admin/lib/canvas-state"
import { describeMapping, type ChartSpec } from "@/shared/lib/chart-spec"

/** 파일 하나도 없을 때. 제목 자리를 비워두지 않는다. */
const FALLBACK_TITLE = "대시보드"

/** 확장자를 떼는 규칙. 이름을 다룰 때마다 정규식을 다시 쓰지 않는다. */
const EXTENSION = /\.[^.]+$/
/** 파일 이름에 못 쓰는 글자. */
const UNSAFE_IN_FILENAME = /[\\/:*?"<>|]/g

/**
 * 대시보드 이름. 파일이 여럿이면 세기만 한다 — 이름을 다 이어 붙이면 뷰어 헤더에서
 * 잘리고, 거기엔 파일 목록이 따로 나오기도 한다.
 */
export function dashboardTitle(datasets: AdminDataset[]): string {
  const [first, ...rest] = datasets
  if (!first) return FALLBACK_TITLE
  if (rest.length === 0) return first.name
  // 확장자를 **여기서** 뗀다. 뒤에 " 외 2개"가 붙고 나면 `baseName`이 마지막 점 뒤를
  // 확장자로 보고 통째로 잘라내서 이름이 "sales"만 남는다.
  return `${first.name.replace(EXTENSION, "")} 외 ${rest.length}개`
}

/**
 * 제목 입력란이 아직 없어서 매핑 요약을 제목으로 쓴다 — 카드 머리에 뜨는 그 문장이다.
 * 매핑이 비어 있으면 그것도 못 만드니 번호로 떨어진다.
 */
export function chartTitle(spec: ChartSpec, index: number): string {
  const { axes, aside } = describeMapping(spec)
  if (!axes) return `차트 ${index + 1}`
  return aside ? `${axes} · ${aside}` : axes
}

/** 내려받을 파일 이름. 확장자를 떼고 파일 이름에 못 쓰는 글자를 눕힌다. */
export function baseName(name: string): string {
  return name.replace(EXTENSION, "").replace(UNSAFE_IN_FILENAME, "-") || "dashboard"
}
