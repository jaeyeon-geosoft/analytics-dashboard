import GridLayout, { useContainerWidth, type Layout } from "react-grid-layout"

import { GRID_COLS, GRID_MARGIN, GRID_ROW_HEIGHT } from "@/shared/lib/dashboard"

/**
 * 카드를 놓는 격자. **어드민과 뷰어가 같은 것을 쓴다** — `layout`이 칸 단위라
 * 기하가 한 톨이라도 다르면 같은 대시보드가 두 화면에서 다르게 배치된다(절대 원칙 1).
 * 예전에는 뷰어만 CSS Grid로 따로 그렸는데, 뷰어에서도 끌어 옮기게 되면서 규격이
 * 두 벌이 될 이유가 없어졌다.
 *
 * 카드를 만드는 것은 양쪽이 알아서 한다(어드민은 번호·선택·삭제가 붙는다).
 * 여기가 맡는 것은 **칸 규격과 끌기 규칙** 뿐이다.
 */
export function ChartGrid({
  layout,
  onLayoutChange,
  locked = false,
  children,
}: {
  layout: Layout
  onLayoutChange: (next: Layout) => void
  /** 잠기면 손잡이가 사라지고 끌리지도 않는다. 뷰어의 기본값이다. */
  locked?: boolean
  children: React.ReactNode
}) {
  const { width, containerRef, mounted } = useContainerWidth()

  return (
    <div ref={containerRef}>
      {mounted && (
        <GridLayout
          width={width}
          layout={layout}
          onLayoutChange={onLayoutChange}
          gridConfig={{
            cols: GRID_COLS,
            rowHeight: GRID_ROW_HEIGHT,
            margin: [GRID_MARGIN, GRID_MARGIN],
            containerPadding: [0, 0],
          }}
          // 카드 안의 버튼·토글을 누르는 것은 드래그가 아니다. 차트 위를 끄는 것은
          // 드래그가 맞다 — Recharts의 크로스헤어는 버튼을 누르지 않은 이동에만 반응한다.
          dragConfig={{ enabled: !locked, cancel: "button,[role=radiogroup]" }}
          resizeConfig={{ enabled: !locked }}
        >
          {children}
        </GridLayout>
      )}
    </div>
  )
}
