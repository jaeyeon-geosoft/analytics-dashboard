import { AlertTriangle, Timer } from "lucide-react"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select"
import {
  COLUMN_TYPE_LABELS,
  columnWarning,
  type ColumnInfo,
  type ColumnType,
} from "@/shared/lib/infer-types"

const TYPES: ColumnType[] = ["number", "date", "category"]

export function ColumnList({
  columns,
  onTypeChange,
  gapSources,
  onDeriveGap,
}: {
  columns: ColumnInfo[]
  onTypeChange: (name: string, type: ColumnType) => void
  /** 시차 컬럼을 만들 수 있는 컬럼 이름들. 이미 만든 것은 빠져 있다. */
  gapSources: Set<string>
  onDeriveGap: (name: string) => void
}) {
  // 높이 제한은 사이드바가 따로 스크롤되는 데스크톱에서만. 모바일은 페이지가
  // 스크롤되므로 여기서 또 자르면 스크롤 영역이 겹쳐 손가락으로 다루기 나쁘다.
  return (
    <div className="space-y-1 lg:max-h-56 lg:overflow-y-auto">
      {columns.map((column) => {
        const note = columnWarning(column)
        return (
          <div
            key={column.name}
            className="grid grid-cols-[minmax(0,1fr)_5.5rem] items-center gap-2"
          >
            <div className="flex min-w-0 items-center gap-1">
              <span className="truncate font-mono text-xs" title={column.name}>
                {column.name}
              </span>
              {note && (
                <span className="shrink-0 text-muted-foreground" title={note}>
                  <AlertTriangle className="size-3" />
                  <span className="sr-only">{note}</span>
                </span>
              )}
              {/*
                시각이 든 날짜 컬럼에만 붙는다. 컬럼마다 버튼이 서 있으면 어수선해지므로
                만들 수 있는 자리에만 내놓고, 한 번 만들면 사라진다.
              */}
              {gapSources.has(column.name) && (
                <button
                  type="button"
                  onClick={() => onDeriveGap(column.name)}
                  title={`${column.name}의 직전 행과의 시차(초) 컬럼을 만듭니다`}
                  className="shrink-0 rounded text-muted-foreground hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  <Timer className="size-3.5" />
                  <span className="sr-only">{column.name} 시차 컬럼 만들기</span>
                </button>
              )}
            </div>
            <Select
              value={column.type}
              onValueChange={(next) => onTypeChange(column.name, next as ColumnType)}
            >
              <SelectTrigger size="sm" className="w-full min-w-0 text-xs" aria-label={`${column.name} 타입`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPES.map((type) => (
                  <SelectItem key={type} value={type} className="text-xs">
                    {COLUMN_TYPE_LABELS[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )
      })}
    </div>
  )
}
