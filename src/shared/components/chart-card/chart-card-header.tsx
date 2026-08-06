import { AlertTriangle, X } from "lucide-react"

import { Button } from "@/shared/components/ui/button"
import { CardBadge } from "@/shared/components/card-badge"
import type { View } from "@/shared/components/chart-card/constants"
import type { CardHeading } from "@/shared/components/chart-card/heading"
import { ViewToggle } from "@/shared/components/chart-card/view-toggle"

/**
 * 카드 머리줄.
 *
 * 두 층이다 — **무엇을 재는가**(제목)와 **무엇을 기준으로 갈랐는가**(부제). 한 줄로
 * 이어 붙였을 때는 카드가 좁아지면 앞에서부터 잘려서 정작 재는 값이 먼저 사라졌다.
 *
 * 편집 어포던스(번호·삭제)는 어드민에서만 들어온다. 뷰어는 넘기지 않으므로 통째로 빠진다.
 */
export function ChartCardHeader({
  heading,
  caveats,
  number,
  selected,
  view,
  onSelect,
  onSelectView,
  onRemove,
}: {
  heading: CardHeading
  caveats: string[]
  number?: number
  selected?: boolean
  /** 그릴 것이 없으면 토글도 없다. 바꿔 봐야 같은 빈 화면이다. */
  view?: View
  onSelect?: () => void
  onSelectView: (next: View) => void
  onRemove?: () => void
}) {
  return (
    <header className="flex shrink-0 items-start gap-2.5 border-b border-border px-4 py-3">
      {/*
        번호는 장식이 아니다. 사이드바의 같은 배지와 짝이 되어 "지금 어느 카드를
        편집 중인지"를 두 패널에 걸쳐 잇는다.
      */}
      {onSelect && number !== undefined && (
        <CardBadge
          number={number}
          current={selected}
          label={`차트 ${number} 편집`}
          onSelect={onSelect}
          className="mt-px"
        />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {heading.heading ? (
            <span className="font-mono">{heading.heading}</span>
          ) : (
            <span className="font-normal text-muted-foreground">컬럼 선택 전</span>
          )}
          {heading.aggregation && (
            <span className="font-normal text-muted-foreground"> {heading.aggregation}</span>
          )}
        </p>
        {heading.subtitle && (
          <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">
            {heading.subtitle}
          </p>
        )}
        {caveats.length > 0 && (
          <p className="mt-1 flex items-start gap-1.5 text-xs text-muted-foreground">
            <AlertTriangle className="mt-px size-3.5 shrink-0" />
            <span>{caveats.join(" ")}</span>
          </p>
        )}
      </div>
      {view && <ViewToggle value={view} onSelect={onSelectView} />}
      {onRemove && (
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label={`차트 ${number} 삭제`}
          className="mt-0.5"
          onClick={(event) => {
            event.stopPropagation()
            onRemove()
          }}
        >
          <X />
        </Button>
      )}
    </header>
  )
}
