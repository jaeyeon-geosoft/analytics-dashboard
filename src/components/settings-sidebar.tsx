import { FileSpreadsheet, Replace } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ChartTypePicker, type ChartType } from "@/components/chart-type-picker"
import { ACCEPT_ATTR, formatBytes } from "@/lib/file-constraints"

export type Dataset = { name: string; size: number }

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-2.5 text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
      {children}
    </h2>
  )
}

function AxisSelect({
  id,
  label,
  hint,
  columns,
}: {
  id: string
  label: string
  hint?: string
  columns: string[]
}) {
  return (
    <div className="grid grid-cols-[3.25rem_1fr] items-center gap-2">
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </Label>
      <Select disabled={columns.length === 0}>
        <SelectTrigger id={id} size="sm" className="w-full font-mono text-xs">
          <SelectValue placeholder={columns.length === 0 ? "—" : (hint ?? "컬럼 선택")} />
        </SelectTrigger>
        <SelectContent>
          {columns.map((column) => (
            <SelectItem key={column} value={column} className="font-mono text-xs">
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
  columns,
  chartType,
  onChartTypeChange,
  onFile,
}: {
  dataset: Dataset | null
  columns: string[]
  chartType: ChartType
  onChartTypeChange: (value: ChartType) => void
  onFile: (file: File) => void
}) {
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
            <SectionLabel>축</SectionLabel>
            <div className="space-y-2">
              <AxisSelect id="axis-x" label="X축" columns={columns} />
              <AxisSelect id="axis-y" label="Y축" columns={columns} />
              <AxisSelect id="axis-series" label="분할" hint="없음" columns={columns} />
            </div>
            {dataset && columns.length === 0 && (
              <p className="mt-2.5 text-[11px] leading-relaxed text-muted-foreground">
                컬럼을 읽으면 여기에 채워집니다.
              </p>
            )}
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
