import { AlertTriangle, Timer } from "lucide-react"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  COLUMN_TYPE_LABELS,
  type ColumnInfo,
  type ColumnType,
} from "@/lib/infer-types"

const TYPES: ColumnType[] = ["number", "date", "category"]

/** 이 아래면 값이 섞여 있다는 뜻이라 사용자에게 알린다. */
const LOW_CONFIDENCE = 0.9

/** 왜 못 미더운지 그대로 말해준다. 확인해야 할 게 타입마다 다르다. */
function warning(column: ColumnInfo): string | null {
  if (column.type !== column.inferred) return null // 사용자가 이미 손댔다
  // distinctCount는 전수, sampled는 띄엄띄엄 뽑은 것이라 둘을 구분해서 말해야 정확하다.
  if (column.distinctCount === 0) return "값이 모두 비어 있습니다. 차트에 쓸 수 없습니다."
  if (column.sampled === 0) {
    return "샘플에 값이 없었습니다. 대부분 비어 있는 컬럼이라 추론을 믿기 어렵습니다."
  }
  if (column.confidence >= LOW_CONFIDENCE) return null

  const percent = Math.round(column.confidence * 100)
  if (column.inferred === "category") {
    return `샘플의 ${100 - percent}%는 숫자나 날짜로도 읽힙니다. 우편번호·사번처럼 숫자로 보이는 범주인지 확인해 주세요.`
  }
  return `샘플의 ${percent}%만 ${COLUMN_TYPE_LABELS[column.inferred]}로 읽혔습니다. 값이 섞여 있는지 확인해 주세요.`
}

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
        const note = warning(column)
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
