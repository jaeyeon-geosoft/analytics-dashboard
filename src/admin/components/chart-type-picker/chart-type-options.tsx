import type { ChartType } from "@/shared/lib/chart-types"

export type ChartTypeOption = {
  value: ChartType
  label: string
  /** 고르고 나면 아래에 한 줄 뜨는 설명. 종류 이름만으로는 언제 쓰는지 모른다. */
  hint: string
  glyph: React.ReactNode
}

/**
 * 글리프는 lucide 아이콘이 아니라 이 도구가 실제로 그리는 마크를 축소한 것이다.
 * 막대 끝은 라운드, 선은 2px — 캔버스에 나올 모양과 같은 어휘를 쓴다.
 */
export const CHART_TYPES: ChartTypeOption[] = [
  {
    value: "bar",
    label: "막대",
    hint: "범주별 크기 비교",
    glyph: (
      <>
        <rect x="2.5" y="8" width="3.5" height="7" rx="1" />
        <rect x="8.25" y="3.5" width="3.5" height="11.5" rx="1" />
        <rect x="14" y="6" width="3.5" height="9" rx="1" />
      </>
    ),
  },
  {
    value: "hbar",
    label: "가로 막대",
    hint: "이름이 긴 범주 비교",
    glyph: (
      <>
        <rect x="2.5" y="3" width="12" height="3.2" rx="1" />
        <rect x="2.5" y="8.4" width="7" height="3.2" rx="1" />
        <rect x="2.5" y="13.8" width="10" height="3.2" rx="1" />
      </>
    ),
  },
  {
    value: "stacked",
    label: "누적 막대",
    hint: "합계와 구성 비율",
    glyph: (
      <>
        <rect x="3" y="9" width="4.5" height="6" rx="1" />
        <rect x="3" y="5" width="4.5" height="3" rx="1" opacity="0.45" />
        <rect x="12.5" y="7" width="4.5" height="8" rx="1" />
        <rect x="12.5" y="2.5" width="4.5" height="3.5" rx="1" opacity="0.45" />
      </>
    ),
  },
  {
    value: "line",
    label: "선",
    hint: "시간에 따른 변화",
    glyph: (
      <polyline
        points="2.5,13 7,8 11.5,10.5 17.5,4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },
  {
    value: "area",
    label: "영역",
    hint: "누적된 양의 추이",
    glyph: (
      <>
        <path d="M2.5 13 7 8l4.5 2.5L17.5 4v11h-15z" opacity="0.35" />
        <polyline
          points="2.5,13 7,8 11.5,10.5 17.5,4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </>
    ),
  },
  {
    value: "scatter",
    label: "산점도",
    hint: "두 수치의 관계",
    glyph: (
      <>
        <circle cx="4.5" cy="13" r="1.8" />
        <circle cx="8" cy="7.5" r="1.8" />
        <circle cx="12" cy="10.5" r="1.8" />
        <circle cx="15.5" cy="4.5" r="1.8" />
      </>
    ),
  },
  {
    value: "path",
    label: "궤적",
    // 산점도와 달리 "행 순서"가 곧 정보다. 파일에 적힌 순서대로 펜을 잇는다.
    hint: "점을 행 순서대로 이은 경로",
    glyph: (
      <>
        <polyline
          points="4.5,13 8,7.5 12,10.5 15.5,4.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="4.5" cy="13" r="1.8" />
        <circle cx="8" cy="7.5" r="1.8" />
        <circle cx="12" cy="10.5" r="1.8" />
        <circle cx="15.5" cy="4.5" r="1.8" />
      </>
    ),
  },
  {
    value: "pie",
    label: "원형",
    // 부분-전체는 누적 막대가 기본이다. 원형은 값이 뚜렷하게 차이 날 때만.
    hint: "구성 비율 — 조각 6개 이하",
    glyph: (
      <>
        <path d="M10 9 16.5 9A6.5 6.5 0 1 1 10 2.5Z" />
        <path d="M10 9 10 2.5A6.5 6.5 0 0 1 16.5 9Z" opacity="0.4" />
      </>
    ),
  },
]
