import { Spinner } from "@/shared/components/ui/spinner"
import { ChartView } from "@/shared/components/chart-view"
import { DataTable } from "@/shared/components/data-table"
import type { View } from "@/shared/components/chart-card/constants"
import type { PlotData } from "@/shared/lib/aggregate"
import type { ChartType } from "@/shared/lib/chart-types"

/**
 * 그릴 자리.
 *
 * `relative` + 자식 `absolute`로 채운다. `flex-1`은 높이가 auto라서 자식의 `h-full`
 * (백분율)이 해석되지 못하고 콘텐츠 높이로 무너진다 — Recharts가 47px짜리 플롯을 그렸다.
 */
export function ChartCardBody({
  plot,
  chartType,
  view,
  busy,
  pending,
  missing,
  onLabelsFolded,
}: {
  plot: PlotData | null
  chartType: ChartType
  view: View
  /** 계산·전환 중. 이전 차트를 남긴 채 흐리게 덮는다 — 비워버리면 화면이 튄다. */
  busy: boolean
  /** 아직 계산 전. "그릴 게 없다"는 문구가 한 프레임 스치지 않게 막는다. */
  pending: boolean
  /** 비어 있는 필수 슬롯의 이름들. 무엇을 고르면 되는지 말해준다. */
  missing: string[]
  onLabelsFolded: (folded: boolean) => void
}) {
  return (
    <div className="relative min-h-64 flex-1 p-4">
      {/* 계산 중에도 이전 차트를 남겨둔다. 비워버리면 화면이 튄다. */}
      <div className={busy ? "pointer-events-none h-full opacity-40" : "h-full"}>
        {plot === null ? (
          // 아직 계산 전인데 "그릴 게 없다"고 하면 안 된다. 표시를 안 띄우는
          // 빠른 경우에도 이 문구가 한 프레임 스쳐서는 안 되므로 pending으로 막는다.
          !pending && (
            <p className="flex h-full items-center justify-center px-6 text-center text-sm text-muted-foreground">
              {missing.length > 0
                ? `${missing.join(", ")}을(를) 고르면 차트가 그려집니다.`
                : "고른 컬럼으로 그릴 수 있는 값이 없습니다. 컬럼 타입을 확인해 주세요."}
            </p>
          )
        ) : view === "chart" ? (
          <ChartView chartType={chartType} plot={plot} onLabelsFolded={onLabelsFolded} />
        ) : (
          <DataTable plot={plot} />
        )}
      </div>
      {busy && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-2 text-xs text-muted-foreground shadow-sm">
            <Spinner className="size-3.5" aria-label="차트를 그리는 중" />
            차트를 그리는 중…
          </p>
        </div>
      )}
    </div>
  )
}
