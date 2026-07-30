import { AlertTriangle } from "lucide-react"

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
}: {
  columns: ColumnInfo[]
  onTypeChange: (name: string, type: ColumnType) => void
}) {
  return (
    <div className="max-h-56 space-y-1 overflow-y-auto">
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
