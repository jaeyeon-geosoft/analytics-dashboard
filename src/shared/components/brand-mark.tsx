import { cn } from "@/shared/lib/utils"

/**
 * 어드민·뷰어 헤더가 같이 쓰는 마크. 두 화면이 한 제품으로 읽혀야 해서 shared에 둔다.
 *
 * 막대 셋이 오름차순이라 "크기"고, 크기는 범주형이 아니라 순차형이다 — 그래서
 * `--chart-seq-*` 램프를 탄다. 하드코딩한 색이 없어서 라이트·다크가 각각 맞는다.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn("size-7 shrink-0", className)} aria-hidden>
      {/* 램프에서 한 칸씩 건너뛴다 — 28px에서는 이웃한 단계끼리 같은 색으로 보인다.
          끝은 seq-1이 아니라 seq-2다. seq-1은 배경에 가장 가까운 단계라 다크에서
          첫 막대가 사라진다 — 차트에서는 그게 맞지만 마크에서는 빠진 것처럼 보인다. */}
      <rect x="3" y="11.5" width="5" height="7" rx="1.5" className="fill-chart-seq-2" />
      <rect x="9.5" y="7.5" width="5" height="11" rx="1.5" className="fill-chart-seq-3" />
      <rect x="16" y="3.5" width="5" height="15" rx="1.5" className="fill-chart-seq-5" />
      {/* 축. 막대만 있으면 로고가 공중에 뜬다 — 이 한 줄이 "차트"라고 말한다. */}
      <rect x="2.5" y="19.75" width="19" height="1.1" rx="0.55" className="fill-foreground/20" />
    </svg>
  )
}
