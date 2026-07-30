import { FileSpreadsheet, Replace } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ChartTypePicker, type ChartType } from "@/components/chart-type-picker"
import { ColumnList } from "@/components/column-list"
import { AGGREGATION_LABELS, type Aggregation } from "@/lib/aggregate"
import { ACCEPT_ATTR, formatBytes } from "@/lib/file-constraints"
import { COLUMN_TYPE_LABELS, type ColumnInfo, type ColumnType } from "@/lib/infer-types"
import {
  MAPPING_SLOTS,
  candidatesFor,
  type Mapping,
  type MappingKey,
  type MappingSlot,
} from "@/lib/mapping-slots"
import type { ParsedFile } from "@/lib/parse-file"

export type Dataset = { name: string; size: number }

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-2.5 text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
      {children}
    </h2>
  )
}

/**
 * Radix SelectItem은 빈 문자열 value를 못 받아서 "없음"에 별도 값이 필요하다.
 * 컬럼 쪽에 접두사를 붙여두면 `없음`이라는 이름의 컬럼이 있어도 겹치지 않는다.
 */
const NONE_VALUE = "none"
const columnValue = (column: string) => `col:${column}`

/** 후보가 없을 때 왜 없는지 말해준다. 빈 드롭다운만 보여주면 알 수가 없다. */
function emptyReason(slot: MappingSlot, hasColumns: boolean): string {
  if (!hasColumns) return "—"
  const types = slot.accepts.map((type) => COLUMN_TYPE_LABELS[type]).join("·")
  if (slot.maxDistinct !== undefined) return `${types} 중 고유값 ${slot.maxDistinct}개 이하 없음`
  return `${types} 컬럼 없음`
}

function MappingSelect({
  slot,
  columns,
  value,
  onValueChange,
}: {
  slot: MappingSlot
  columns: ColumnInfo[]
  value?: string
  onValueChange: (column?: string) => void
}) {
  const id = `mapping-${slot.key}`
  const candidates = candidatesFor(slot, columns)
  const disabled = candidates.length === 0

  return (
    <div className="grid grid-cols-[4.5rem_1fr] items-center gap-2">
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {slot.label}
      </Label>
      <Select
        // 선택 슬롯은 비었을 때도 "없음"이 실제로 선택된 상태로 둔다.
        value={value ? columnValue(value) : slot.optional ? NONE_VALUE : undefined}
        onValueChange={(next) =>
          onValueChange(next === NONE_VALUE ? undefined : next.slice("col:".length))
        }
        disabled={disabled}
      >
        <SelectTrigger id={id} size="sm" className="w-full font-mono text-xs">
          <SelectValue
            placeholder={
              disabled
                ? emptyReason(slot, columns.length > 0)
                : slot.optional
                  ? "없음"
                  : "컬럼 선택"
            }
          />
        </SelectTrigger>
        <SelectContent>
          {slot.optional && (
            <>
              <SelectItem value={NONE_VALUE} className="text-xs">
                없음
              </SelectItem>
              <SelectSeparator />
            </>
          )}
          {candidates.map((column) => (
            <SelectItem
              key={column.name}
              value={columnValue(column.name)}
              className="font-mono text-xs"
            >
              {column.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

export function SettingsSidebar({
  dataset,
  data,
  columns,
  onColumnTypeChange,
  chartType,
  onChartTypeChange,
  mapping,
  onMappingChange,
  aggregation,
  onAggregationChange,
  onSheetChange,
  onFile,
}: {
  dataset: Dataset | null
  data: ParsedFile | null
  columns: ColumnInfo[]
  onColumnTypeChange: (name: string, type: ColumnType) => void
  chartType: ChartType
  onChartTypeChange: (value: ChartType) => void
  mapping: Mapping
  onMappingChange: (key: MappingKey, column?: string) => void
  aggregation: Aggregation
  onAggregationChange: (value: Aggregation) => void
  onSheetChange: (name: string) => void
  onFile: (file: File) => void
}) {
  return (
    <aside className="flex w-full shrink-0 flex-col border-b border-border lg:h-full lg:w-72 lg:border-r lg:border-b-0">
      {/* min-h-0가 없으면 flex 자식이 부모를 넘쳐서 사이드바 대신 페이지가 스크롤된다. */}
      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-6 p-4">
          <section>
            <SectionLabel>데이터셋</SectionLabel>
            {dataset ? (
              <div className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2.5">
                <FileSpreadsheet className="size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono text-xs" title={dataset.name}>
                    {dataset.name}
                  </p>
                  <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                    {formatBytes(dataset.size)}
                    {data && ` · ${data.rows.length.toLocaleString()}행`}
                    {/* Excel은 인코딩 개념이 없어서 null이다. */}
                    {data?.encoding && data.encoding !== "utf-8" &&
                      ` · ${data.encoding.toUpperCase()}`}
                  </p>
                </div>
                <Button asChild variant="ghost" size="icon-xs" aria-label="다른 파일로 교체">
                  <label className="cursor-pointer">
                    <Replace />
                    <input
                      type="file"
                      accept={ACCEPT_ATTR}
                      className="sr-only"
                      onChange={(event) => {
                        const file = event.target.files?.[0]
                        if (file) onFile(file)
                        event.target.value = ""
                      }}
                    />
                  </label>
                </Button>
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-border px-3 py-2.5 text-xs text-muted-foreground">
                아직 연 파일이 없습니다.
              </p>
            )}

            {/* 시트가 하나뿐이면 고를 게 없다. */}
            {data && data.sheets.length > 1 && (
              <div className="mt-2 grid grid-cols-[4.5rem_1fr] items-center gap-2">
                <Label htmlFor="sheet" className="text-xs text-muted-foreground">
                  시트
                </Label>
                <Select value={data.sheet ?? undefined} onValueChange={onSheetChange}>
                  <SelectTrigger id="sheet" size="sm" className="w-full font-mono text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {data.sheets.map((name) => (
                      <SelectItem key={name} value={name} className="font-mono text-xs">
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </section>

          {columns.length > 0 && (
            <section>
              <SectionLabel>컬럼 {columns.length}개</SectionLabel>
              <ColumnList columns={columns} onTypeChange={onColumnTypeChange} />
            </section>
          )}

          <section>
            <SectionLabel>차트 종류</SectionLabel>
            <ChartTypePicker
              value={chartType}
              onValueChange={onChartTypeChange}
              disabled={!dataset}
            />
          </section>

          <section>
            <SectionLabel>매핑</SectionLabel>
            <div className="space-y-2">
              {MAPPING_SLOTS[chartType].map((slot) => (
                <MappingSelect
                  key={slot.key}
                  slot={slot}
                  columns={columns}
                  value={mapping[slot.key]}
                  onValueChange={(column) => onMappingChange(slot.key, column)}
                />
              ))}
              {/* 산점도는 행 하나가 점 하나라 묶을 일이 없다. */}
              {chartType !== "scatter" && (
                <div className="grid grid-cols-[4.5rem_1fr] items-center gap-2">
                  <Label htmlFor="aggregation" className="text-xs text-muted-foreground">
                    집계
                  </Label>
                  <Select
                    value={aggregation}
                    onValueChange={(next) => onAggregationChange(next as Aggregation)}
                    disabled={columns.length === 0}
                  >
                    <SelectTrigger id="aggregation" size="sm" className="w-full text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(AGGREGATION_LABELS) as Aggregation[]).map((option) => (
                        <SelectItem key={option} value={option} className="text-xs">
                          {AGGREGATION_LABELS[option]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </section>
        </div>
      </ScrollArea>

      <div className="border-t border-border p-4">
        <SectionLabel>로컬 전용</SectionLabel>
        <ul className="space-y-1 border-l border-border pl-3 text-[11px] leading-relaxed text-muted-foreground">
          <li>파일은 이 브라우저 밖으로 나가지 않습니다.</li>
          <li>기기에 저장하지 않습니다.</li>
          <li>새로고침하면 초기화됩니다.</li>
        </ul>
      </div>
    </aside>
  )
}
