import { AxisName } from "@/shared/components/chart-view/axis-name"
import type { PlotWindow } from "@/shared/components/chart-view/hooks/use-plot-window"
import { cn } from "@/shared/lib/utils"

/**
 * 축 이름은 Recharts의 `label` 대신 바깥에 HTML로 둔다. `insideLeft` 회전 라벨은
 * 눈금과 겹치고 폭을 예측할 수 없다. 여기 두면 텍스트 토큰도 그대로 쓸 수 있다.
 *
 * `plot`을 주면 창 스크롤바가 붙는다 — 가로 막대는 오른쪽, 세로 막대는 아래.
 * 창을 쓰지 않는 종류(선·영역·산점도)는 주지 않는다.
 */
export function AxisFrame({
  xLabel,
  yLabel,
  yRightLabel,
  colors,
  plot,
  children,
}: {
  xLabel: string
  yLabel: string
  /** 오른쪽 축 이름. 이중 축(선 차트)에서만 들어온다. */
  yRightLabel?: string
  /** 이중 축일 때 두 축 이름에 붙일 선 색 */
  colors?: [string, string]
  plot?: PlotWindow
  children: React.ReactNode
}) {
  return (
    <div className="absolute inset-0 flex flex-col">
      {/*
        값 축 이름은 플롯 **위**에 가로로. 하나면 가운데 — 아래 X축 이름과 같은 자리라
        둘이 위아래로 짝을 이룬다. **축이 둘일 때만 양 끝으로 벌린다**: 그때는 자리가
        "어느 축의 이름인지"를 말하므로 가운데 모으면 그 구분이 사라진다.
      */}
      <div
        className={cn(
          "mt-1.5 mb-2 flex shrink-0 items-baseline gap-3",
          yRightLabel ? "justify-between" : "justify-center"
        )}
      >
        <AxisName label={yLabel} color={colors?.[0]} />
        {yRightLabel && <AxisName label={yRightLabel} color={colors?.[1]} align="right" />}
      </div>
      <div className="flex min-h-0 flex-1">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="flex min-h-0 min-w-0 flex-1">
            <div
              ref={plot?.plotRef}
              onWheel={plot?.onWheel}
              className="relative min-h-0 min-w-0 flex-1"
            >
              {children}
            </div>
            {plot?.vertical && plot.bar}
          </div>
          {plot && !plot.vertical && plot.bar}
        </div>
      </div>
      <p
        className="mt-1.5 shrink-0 truncate text-center text-[10px] font-medium tracking-[0.06em] text-muted-foreground"
        title={xLabel}
      >
        {xLabel}
      </p>
    </div>
  )
}
