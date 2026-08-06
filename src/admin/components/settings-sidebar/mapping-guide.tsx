import type { ChartType } from "@/shared/lib/chart-types"
import { MAPPING_SLOTS, usesAggregation } from "@/shared/lib/mapping-slots"

/** 슬롯 바깥의 컨트롤도 같은 표에 실린다. 설명을 두 군데로 나누지 않는다. */
const AGGREGATION_HINT = "같은 범주가 여러 줄일 때 합칠 방법"
const ORDER_HINT = "범주를 세우는 순서. 기본은 파일에 있는 그대로입니다"

/** 슬롯 설명을 한 곳에 모은 표. 아이콘을 컨트롤마다 두면 그게 더 어수선하다. */
export function MappingGuide({
  chartType,
  sortable,
}: {
  chartType: ChartType
  sortable: boolean
}) {
  const rows = MAPPING_SLOTS[chartType].map((slot) => [slot.label, slot.hint] as const)
  if (usesAggregation(chartType)) rows.push(["집계", AGGREGATION_HINT])
  if (sortable) rows.push(["정렬", ORDER_HINT])

  return (
    <>
      <p>어느 컬럼을 차트의 어디에 놓을지 고릅니다.</p>
      {/* 반전된 표면이라 muted-foreground를 쓰면 안 보인다. 배경색을 흐려서 쓴다. */}
      <dl className="mt-2.5 space-y-1.5 border-t border-background/20 pt-2.5">
        {rows.map(([label, hint]) => (
          <div key={label} className="flex gap-2.5">
            <dt className="w-14 shrink-0 font-medium">{label}</dt>
            <dd className="min-w-0 text-background/70">{hint}</dd>
          </div>
        ))}
      </dl>
      {/* 잠기는 이유는 트리거에도 한마디씩 뜨지만, 규칙 자체는 여기서 한 번에 말한다. */}
      {chartType === "line" && (
        <p className="mt-2.5 border-t border-background/20 pt-2.5 text-background/70">
          Y축(우)는 분할·개수 집계와 함께 쓸 수 없습니다. 한쪽을 비우면 다시 열립니다.
        </p>
      )}
    </>
  )
}
