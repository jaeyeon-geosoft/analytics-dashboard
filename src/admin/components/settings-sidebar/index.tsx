import { useState } from "react"

import { ScrollArea } from "@/shared/components/ui/scroll-area"
import { CardBadge } from "@/shared/components/card-badge"
import { ChartSettings } from "@/admin/components/settings-sidebar/chart-settings"
import { FileList } from "@/admin/components/settings-sidebar/file-list"
import type { AdminChart, AdminDataset } from "@/admin/lib/canvas-state"
import type { ChartSpec } from "@/shared/lib/chart-spec"
import type { ColumnType } from "@/shared/lib/infer-types"

/**
 * 사이드바는 두 층이다 — 위는 **열어둔 표들**(표마다 헤더 행·컬럼 타입), 아래는
 * **선택된 카드 하나**의 설정. 표에 딸린 것을 표 안에 넣지 않으면 파일이 둘일 때
 * "이 컬럼이 어느 파일 것인지"가 화면에서 사라진다.
 */
export function SettingsSidebar({
  datasets,
  charts,
  chart,
  chartNumber,
  onColumnTypeChange,
  onChartChange,
  onChartFile,
  onChartSheet,
  onHeaderRowChange,
  onDeriveGap,
  onCloseDataset,
  onFile,
}: {
  /** 열어둔 파일 전부. 목록이자 카드가 고를 수 있는 후보다. */
  datasets: AdminDataset[]
  /** 어느 카드가 어느 파일을 보는지. 파일 목록의 번호 배지가 여기서 나온다. */
  charts: AdminChart[]
  /**
   * 지금 편집 중인 카드. 종류·매핑·집계·기준선은 한 덩어리라 통째로 받는다 —
   * 넷을 값·핸들러 여덟 개로 풀어 받으면 사이드바가 쓰지도 않는 것을 나르기만 한다.
   */
  chart: AdminChart | null
  /** 그 카드의 번호. 캔버스의 같은 배지와 짝이 된다. */
  chartNumber: number
  onColumnTypeChange: (datasetId: string, name: string, type: ColumnType) => void
  onChartChange: (next: ChartSpec) => void
  onChartFile: (fileId: string) => void
  onChartSheet: (sheet: string) => void
  onHeaderRowChange: (datasetId: string, row: number) => void
  onDeriveGap: (datasetId: string, name: string) => void
  onCloseDataset: (datasetId: string) => void
  onFile: (file: File) => void
}) {
  // 지금 카드가 보는 파일을 펼쳐 둔다. 파일을 새로 열면 그 파일을 보는 카드가 곧바로
  // 선택되므로, "방금 연 파일이 펼쳐진다"도 이 규칙 하나에서 나온다.
  //
  // effect가 아니라 렌더 중에 맞춘다 — effect에서 setState하면 이미 그린 뒤에 한 번 더
  // 그리게 되고(접힌 상태가 한 프레임 스친다), 그 사이 사용자가 접으면 되살아난다.
  const [open, setOpen] = useState<string | undefined>(chart?.datasetId)
  const [syncedTo, setSyncedTo] = useState(chart?.datasetId)
  if (syncedTo !== chart?.datasetId) {
    setSyncedTo(chart?.datasetId)
    setOpen(chart?.datasetId)
  }

  const dataset = datasets.find((entry) => entry.id === chart?.datasetId) ?? null
  const usersOf = (datasetId: string) =>
    charts
      .map((entry, index) => ({ number: index + 1, id: entry.spec.id, datasetId: entry.datasetId }))
      .filter((entry) => entry.datasetId === datasetId)

  return (
    <aside className="flex w-full shrink-0 flex-col border-t border-border lg:h-full lg:w-72 lg:border-t-0 lg:border-r">
      {/*
        min-h-0가 없으면 flex 자식이 부모를 넘쳐서 사이드바 대신 페이지가 스크롤된다.

        Radix는 뷰포트 안에 `display: table` 래퍼를 인라인 스타일로 넣는다. 그대로 두면
        컨테이너 폭을 무시하고 내용만큼 부풀어서(288px 자리에 471px) 사이드바가 통째로
        잘린다. 인라인 스타일을 이겨야 해서 `!`가 필요하다.
      */}
      <ScrollArea className="min-h-0 flex-1 [&_[data-slot=scroll-area-viewport]>div]:block!">
        {/*
          쌓였을 때는 폭이 사이드바보다 훨씬 넓어진다. 그대로 두면 라벨과 Select가
          양 끝으로 벌어져서 짝이 안 보인다. 읽을 만한 폭으로 묶고 가운데 정렬한다.
        */}
        <div className="mx-auto max-w-lg space-y-6 p-4 lg:mx-0 lg:max-w-none">
          <FileList
            datasets={datasets}
            open={open}
            onOpenChange={setOpen}
            usersOf={usersOf}
            currentChartId={chart?.spec.id}
            onColumnTypeChange={onColumnTypeChange}
            onDeriveGap={onDeriveGap}
            onHeaderRowChange={onHeaderRowChange}
            onCloseDataset={onCloseDataset}
            onFile={onFile}
          />

          {/*
            여기서 층이 바뀐다 — 위는 파일, 아래는 그중 한 카드의 설정이다. 카드가
            한 장이고 파일도 하나면 헷갈릴 것이 없으니 띄우지 않는다.
          */}
          {chart && (charts.length > 1 || datasets.length > 1) && (
            <div className="flex items-center gap-2 border-t border-border pt-5">
              <CardBadge number={chartNumber} current />
              <h2 className="text-xs font-medium">차트 {chartNumber}</h2>
              {charts.length > 1 && (
                <span className="ml-auto text-[11px] text-muted-foreground">카드를 눌러 전환</span>
              )}
            </div>
          )}

          {chart && dataset && (
            <ChartSettings
              chart={chart.spec}
              columns={dataset.columns}
              datasets={datasets}
              dataset={dataset}
              onChartChange={onChartChange}
              onFileChange={onChartFile}
              onSheetChange={onChartSheet}
            />
          )}
        </div>
      </ScrollArea>
    </aside>
  )
}
