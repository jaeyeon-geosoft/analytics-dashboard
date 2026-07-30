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
import { ACCEPT_ATTR, formatBytes } from "@/lib/file-constraints"
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
 * 슬롯 key는 차트 종류를 넘나든다. 막대의 `series`와 선의 `series`는 같은 역할이므로,
 * 종류를 바꿔도 선택한 컬럼이 그대로 남는다. 반대로 `category`와 `x`는 다른 역할이라
 * 서로 넘어가지 않는다.
 */
export type MappingKey = "category" | "value" | "series" | "x" | "y"

export type Mapping = Partial<Record<MappingKey, string>>

type MappingSlot = { key: MappingKey; label: string; optional?: boolean }

/**
 * 종류마다 필요한 컬럼의 역할이 다르다. 막대·원형은 범주/값이고, 선·산점도는 양쪽이
 * 축이다. 누적 막대는 무엇으로 쌓을지가 없으면 그냥 막대라서 분할이 필수다.
 */
const MAPPING_SLOTS: Record<ChartType, MappingSlot[]> = {
  bar: [
    { key: "category", label: "범주" },
    { key: "value", label: "값" },
    { key: "series", label: "분할", optional: true },
  ],
  hbar: [
    { key: "category", label: "범주" },
    { key: "value", label: "값" },
    { key: "series", label: "분할", optional: true },
  ],
  stacked: [
    { key: "category", label: "범주" },
    { key: "value", label: "값" },
    { key: "series", label: "누적 기준" },
  ],
  line: [
    { key: "x", label: "X축" },
    { key: "y", label: "Y축" },
    { key: "series", label: "분할", optional: true },
  ],
  area: [
    { key: "x", label: "X축" },
    { key: "y", label: "Y축" },
    { key: "series", label: "분할", optional: true },
  ],
  scatter: [
    { key: "x", label: "X축" },
    { key: "y", label: "Y축" },
    { key: "series", label: "분할", optional: true },
  ],
  pie: [
    { key: "category", label: "범주" },
    { key: "value", label: "값" },
  ],
}

/**
 * Radix SelectItem은 빈 문자열 value를 못 받아서 "없음"에 별도 값이 필요하다.
 * 컬럼 쪽에 접두사를 붙여두면 `없음`이라는 이름의 컬럼이 있어도 겹치지 않는다.
 */
const NONE_VALUE = "none"
const columnValue = (column: string) => `col:${column}`

function MappingSelect({
  slot,
  columns,
  value,
  onValueChange,
}: {
  slot: MappingSlot
  columns: string[]
  value?: string
  onValueChange: (column?: string) => void
}) {
  const id = `mapping-${slot.key}`
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
        disabled={columns.length === 0}
      >
        <SelectTrigger id={id} size="sm" className="w-full font-mono text-xs">
          <SelectValue
            placeholder={
              columns.length === 0 ? "—" : slot.optional ? "없음" : "컬럼 선택"
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
          {columns.map((column) => (
            <SelectItem
              key={column}
              value={columnValue(column)}
              className="font-mono text-xs"
            >
              {column}
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
  chartType,
  onChartTypeChange,
  mapping,
  onMappingChange,
  onFile,
}: {
  dataset: Dataset | null
  data: ParsedFile | null
  chartType: ChartType
  onChartTypeChange: (value: ChartType) => void
  mapping: Mapping
  onMappingChange: (key: MappingKey, column?: string) => void
  onFile: (file: File) => void
}) {
  const columns = data?.columns ?? []

  return (
    <aside className="flex w-full shrink-0 flex-col border-b border-border lg:h-full lg:w-72 lg:border-r lg:border-b-0">
      <ScrollArea className="flex-1">
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
                    {data && data.encoding !== "utf-8" && ` · ${data.encoding.toUpperCase()}`}
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
          </section>

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
