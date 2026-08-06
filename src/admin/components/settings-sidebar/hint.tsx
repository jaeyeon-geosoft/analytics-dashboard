import { Info } from "lucide-react"

import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/components/ui/tooltip"

/**
 * 설명은 평소엔 숨어 있고 아이콘에 올렸을 때만 나온다. 사이드바를 설명문으로 채우지
 * 않으려는 것이다. 버튼으로 두는 이유는 키보드로도 닿아야 하기 때문 —
 * `<span>`이면 포커스가 안 간다.
 *
 * **아이콘을 컨트롤마다 달지 말 것.** 줄줄이 서 있으면 그게 더 어수선하다 — 섹션
 * 하나에 하나씩, 그 안의 규칙 전체를 한 번에 말한다.
 */
export function Hint({ children }: { children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label="설명"
          className="text-muted-foreground/60 transition-colors hover:text-foreground focus-visible:text-foreground"
        >
          <Info className="size-3.5" />
        </button>
      </TooltipTrigger>
      {/*
        기본 툴팁은 한 줄짜리 칩이다(`inline-flex items-center`, 좌우 여백만 있음).
        설명은 여러 줄이라 그대로 얹으면 뭉개진다. 배경·색은 디자인 시스템 그대로 두고
        레이아웃만 편다 — 표면을 바꾸려 들면 화살표 색까지 따라다녀야 한다.
      */}
      <TooltipContent
        side="right"
        align="start"
        sideOffset={8}
        className="block max-w-72 px-3.5 py-3 text-left leading-relaxed"
      >
        {children}
      </TooltipContent>
    </Tooltip>
  )
}
