import { useMemo, useState } from "react"

import { ChartCardBody } from "@/shared/components/chart-card/chart-card-body"
import { ChartCardHeader } from "@/shared/components/chart-card/chart-card-header"
import { FOLDED_LABELS_NOTE, caveatsFor } from "@/shared/components/chart-card/caveats"
import { cardHeading } from "@/shared/components/chart-card/heading"
import { useChartTableToggle } from "@/shared/components/chart-card/hooks/use-chart-table-toggle"
import { useDeferredPlot } from "@/shared/components/chart-card/hooks/use-deferred-plot"
import { looksSlow } from "@/shared/components/chart-card/looks-slow"
import { DEFAULT_CATEGORY_ORDER, type ChartSpec } from "@/shared/lib/chart-spec"
import type { DataFrame } from "@/shared/lib/dataset"
import type { ColumnInfo } from "@/shared/lib/infer-types"
import { MAPPING_SLOTS, pickedColumns } from "@/shared/lib/mapping-slots"
import { cn } from "@/shared/lib/utils"

/**
 * 차트 한 장. **어드민과 뷰어가 같은 것을 쓴다**(절대 원칙 1) — 편집 어포던스만
 * 안 넘기면 그대로 보기 전용이 된다.
 */
export function ChartCard({
  spec,
  number,
  order,
  data,
  columns,
  title,
  selected,
  onSelect,
  onRemove,
}: {
  spec: ChartSpec
  /** 사이드바의 같은 배지와 짝이 되는 번호. 어드민에서만 쓴다. */
  number?: number
  /** 그리드에서의 순번. 카드끼리 계산이 같은 프레임에 겹치지 않게 미루는 데 쓴다. */
  order: number
  data: DataFrame
  columns: ColumnInfo[]
  /** 저장된 제목. 없으면 매핑에서 만든다 — 어드민에는 아직 제목 입력란이 없다. */
  title?: string
  /**
   * 편집 어포던스는 전부 선택이다. 뷰어는 고르지도 지우지도 않으므로 넘기지 않고,
   * 그러면 배지·클릭·삭제가 통째로 빠진다. 계산 지연·표 토글·경고는 양쪽 공통이라 남는다.
   */
  selected?: boolean
  onSelect?: () => void
  onRemove?: () => void
}) {
  const { chartType, mapping, aggregation, reference } = spec
  // 이 필드가 생기기 전에 저장된 대시보드에는 없다. 기본은 파일 순서다.
  // 이름이 `categoryOrder`인 것은 위의 `order`(그리드 순번)와 다른 것이기 때문이다.
  const categoryOrder = spec.order ?? DEFAULT_CATEGORY_ORDER

  const request = useMemo(
    () => ({
      chartType,
      mapping,
      aggregation,
      reference,
      order: categoryOrder,
      columns,
      rows: data.rows,
    }),
    [chartType, mapping, aggregation, reference, categoryOrder, columns, data.rows]
  )
  const slow = looksSlow(chartType, data.rows.length)
  const { plot, pending } = useDeferredPlot(request, order)
  const toggle = useChartTableToggle(slow)

  const busy = toggle.swapping || (pending && slow)
  // 막대 값 라벨이 접혔는지는 폭을 재봐야 나오는 값이라 렌더러가 알려준다.
  const [labelsFolded, setLabelsFolded] = useState(false)
  const caveats = plot ? caveatsFor(plot, chartType) : []
  if (labelsFolded) caveats.push(FOLDED_LABELS_NOTE)

  const missing = MAPPING_SLOTS[chartType]
    // 빈 배열도 "안 고름"이다. `!mapping[slot.key]`로 물으면 `[]`가 참이라 통과한다.
    .filter((slot) => !slot.optional && pickedColumns(mapping[slot.key]).length === 0)
    .map((slot) => slot.label)

  return (
    // 카드 아무 데나 누르면 사이드바가 그 카드를 편집한다. 키보드로는 번호 배지가 그 역할.
    <section
      onClick={onSelect}
      className={cn(
        // `overflow-hidden`이 없으면 카드가 내용보다 작아졌을 때 차트·눈금·스크롤바가
        // 테두리 밖으로 그대로 흘러나온다. 어드민에서 카드를 줄일 수 있게 되면서
        // 실제로 그렇게 됐다 — 상자가 내용을 가둬야 모서리의 크기 손잡이도 제자리로 보인다.
        "flex min-h-0 flex-col overflow-hidden rounded-2xl border bg-card transition-colors",
        !onSelect
          ? "border-border"
          : selected
            ? "border-foreground/30"
            : "border-border hover:border-foreground/15"
      )}
    >
      <ChartCardHeader
        heading={cardHeading(spec, title)}
        caveats={caveats}
        number={number}
        selected={selected}
        view={plot ? toggle.pressed : undefined}
        onSelect={onSelect}
        onSelectView={toggle.select}
        onRemove={onRemove}
      />
      <ChartCardBody
        plot={plot}
        chartType={chartType}
        view={toggle.view}
        busy={busy}
        pending={pending}
        missing={missing}
        onLabelsFolded={setLabelsFolded}
      />
    </section>
  )
}
