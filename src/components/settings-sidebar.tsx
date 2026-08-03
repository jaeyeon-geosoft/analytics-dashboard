import { FileSpreadsheet, Info, Replace } from "lucide-react"

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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { ChartTypePicker, type ChartType } from "@/components/chart-type-picker"
import { ColumnList } from "@/components/column-list"
import { AGGREGATION_LABELS, type Aggregation } from "@/lib/aggregate"
import { canDeriveGap, gapColumnName } from "@/lib/derive-column"
import { ACCEPT_ATTR, formatBytes } from "@/lib/file-constraints"
import { COLUMN_TYPE_LABELS, type ColumnInfo, type ColumnType } from "@/lib/infer-types"
import {
  MAPPING_SLOTS,
  candidatesFor,
  lockedReason,
  type Mapping,
  type MappingKey,
  type MappingSlot,
  usesAggregation,
} from "@/lib/mapping-slots"
import type { ParsedFile } from "@/lib/parse-file"

export type Dataset = { name: string; size: number }

/** 헤더 행을 고를 때 그 줄에 뭐가 들어 있는지 보여준다. 번호만으로는 못 고른다. */
function rowSummary(cells: string[]): string {
  const filled = cells.map((cell) => cell.trim()).filter(Boolean)
  if (filled.length === 0) return "(비어 있음)"
  const summary = filled.slice(0, 3).join(", ")
  return filled.length > 3 ? `${summary}…` : summary
}

/**
 * 설명은 평소엔 숨어 있고 아이콘에 올렸을 때만 나온다. 사이드바를 설명문으로 채우지
 * 않으려는 것이다. 버튼으로 두는 이유는 키보드로도 닿아야 하기 때문 —
 * `<span>`이면 포커스가 안 간다.
 */
function Hint({ children }: { children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label="설명"
          className="text-muted-foreground/60 transition-colors hover:text-foreground focus-visible:text-foreground"
        >
          <Info className="size-3.5" />
        </button>
      </TooltipTrigger>
      {/*
        기본 툴팁은 한 줄짜리 칩이다(`inline-flex items-center`, 좌우 여백만 있음).
        설명은 여러 줄이라 그대로 얹으면 뭉개진다. 배경·색은 디자인 시스템 그대로 두고
        레이아웃만 편다 — 표면을 바꾸려 들면 화살표 색까지 따라다녀야 한다.
      */}
      <TooltipContent
        side="right"
        align="start"
        sideOffset={8}
        className="block max-w-72 px-3.5 py-3 text-left leading-relaxed"
      >
        {children}
      </TooltipContent>
    </Tooltip>
  )
}

/** 슬롯 설명을 한 곳에 모은 표. 아이콘을 컨트롤마다 두면 그게 더 어수선하다. */
function MappingGuide({ chartType }: { chartType: ChartType }) {
  const rows = MAPPING_SLOTS[chartType].map((slot) => [slot.label, slot.hint] as const)
  if (usesAggregation(chartType)) {
    rows.push(["집계", "같은 범주가 여러 줄일 때 합칠 방법"])
  }

  return (
    <>
      <p>어느 컬럼을 차트의 어디에 놓을지 고릅니다.</p>
      {/* 반전된 표면이라 muted-foreground를 쓰면 안 보인다. 배경색을 흐려서 쓴다. */}
      <dl className="mt-2.5 space-y-1.5 border-t border-background/20 pt-2.5">
        {rows.map(([label, hint]) => (
          <div key={label} className="flex gap-2.5">
            <dt className="w-14 shrink-0 font-medium">{label}</dt>
            <dd className="min-w-0 text-background/70">{hint}</dd>
          </div>
        ))}
      </dl>
      {/* 잠기는 이유는 트리거에도 한마디씩 뜨지만, 규칙 자체는 여기서 한 번에 말한다. */}
      {chartType === "line" && (
        <p className="mt-2.5 border-t border-background/20 pt-2.5 text-background/70">
          Y축(우)는 분할·개수 집계와 함께 쓸 수 없습니다. 한쪽을 비우면 다시 열립니다.
        </p>
      )}
    </>
  )
}

function SectionLabel({ children, hint }: { children: React.ReactNode; hint?: React.ReactNode }) {
  return (
    <div className="mb-2.5 flex items-center gap-1.5">
      <h2 className="text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
        {children}
      </h2>
      {hint && <Hint>{hint}</Hint>}
    </div>
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
  locked,
  onValueChange,
}: {
  slot: MappingSlot
  columns: ColumnInfo[]
  value?: string
  /**
   * 다른 슬롯 때문에 지금 못 쓰는 이유. 있으면 그 문구를 트리거에 띄우고 잠근다 —
   * 고른 값은 지우지 않고 들고 있다가 잠금이 풀리면 되살아난다.
   */
  locked?: string | null
  onValueChange: (column?: string) => void
}) {
  const id = `mapping-${slot.key}`
  const candidates = candidatesFor(slot, columns)
  const disabled = candidates.length === 0 || Boolean(locked)

  return (
    <div className="grid grid-cols-[5rem_minmax(0,1fr)] items-center gap-2">
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {slot.label}
      </Label>
      <Select
        // 선택 슬롯은 비었을 때도 "없음"이 실제로 선택된 상태로 둔다.
        // 잠겼을 때만은 값을 비워 이유가 보이게 한다 — 값이 들어 있으면 그게 그려지는
        // 줄 알게 된다.
        value={
          locked ? undefined : value ? columnValue(value) : slot.optional ? NONE_VALUE : undefined
        }
        onValueChange={(next) =>
          onValueChange(next === NONE_VALUE ? undefined : next.slice("col:".length))
        }
        disabled={disabled}
      >
        <SelectTrigger id={id} size="sm" className="w-full min-w-0 font-mono text-xs">
          <SelectValue
            placeholder={
              locked
                ? locked
                : disabled
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
  chartNumber,
  chartCount,
  chartType,
  onChartTypeChange,
  mapping,
  onMappingChange,
  aggregation,
  onAggregationChange,
  onSheetChange,
  onHeaderRowChange,
  onDeriveGap,
  onFile,
}: {
  dataset: Dataset | null
  data: ParsedFile | null
  columns: ColumnInfo[]
  onColumnTypeChange: (name: string, type: ColumnType) => void
  /** 지금 편집 중인 카드의 번호. 캔버스의 같은 배지와 짝이 된다. */
  chartNumber: number
  chartCount: number
  chartType: ChartType
  onChartTypeChange: (value: ChartType) => void
  mapping: Mapping
  onMappingChange: (key: MappingKey, column?: string) => void
  aggregation: Aggregation
  onAggregationChange: (value: Aggregation) => void
  onSheetChange: (name: string) => void
  onHeaderRowChange: (row: number) => void
  onDeriveGap: (name: string) => void
  onFile: (file: File) => void
}) {
  // 시차를 만들 수 있는 컬럼: 시각이 든 날짜 컬럼이고, 아직 안 만든 것.
  const names = new Set(columns.map((column) => column.name))
  const gapSources = new Set(
    columns
      .filter(
        (column) =>
          column.type === "date" &&
          !names.has(gapColumnName(column.name)) &&
          data !== null &&
          canDeriveGap(data.rows, column.name)
      )
      .map((column) => column.name)
  )

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
                열린 파일이 없습니다.
              </p>
            )}

            {/* 헤더가 1행이 아닌 파일(제목 줄이 위에 붙은 리포트)을 위한 선택. */}
            {data && data.preview.length > 1 && (
              <div className="mt-2 grid grid-cols-[5rem_minmax(0,1fr)] items-center gap-2">
                <div className="flex items-center gap-1">
                  <Label htmlFor="header-row" className="text-xs text-muted-foreground">
                    헤더 행
                  </Label>
                  <Hint>
                    컬럼 이름이 적힌 줄입니다.
                    <br />
                    제목 줄이 위에 붙은 파일만 바꾸면 됩니다.
                  </Hint>
                </div>
                <Select
                  value={String(data.headerRow)}
                  onValueChange={(next) => onHeaderRowChange(Number(next))}
                >
                  <SelectTrigger id="header-row" size="sm" className="w-full min-w-0 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {data.preview.map((cells, index) => (
                      <SelectItem key={index} value={String(index + 1)} className="text-xs">
                        <span className="shrink-0 text-muted-foreground">{index + 1}행</span>
                        {/* 트리거 안에서는 이 줄이 좁은 사이드바를 넘치면 안 된다. */}
                        <span className="ml-1.5 min-w-0 truncate font-mono">
                          {rowSummary(cells)}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* 시트가 하나뿐이면 고를 게 없다. */}
            {data && data.sheets.length > 1 && (
              <div className="mt-2 grid grid-cols-[4.5rem_minmax(0,1fr)] items-center gap-2">
                <Label htmlFor="sheet" className="text-xs text-muted-foreground">
                  시트
                </Label>
                <Select value={data.sheet ?? undefined} onValueChange={onSheetChange}>
                  <SelectTrigger id="sheet" size="sm" className="w-full min-w-0 font-mono text-xs">
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
              <SectionLabel
                  hint={
                    <>
                      컬럼의 값이 맞는지 확인하세요.
                      <br />
                      수정하면 아래 선택지가 자동으로 바뀝니다.
                    </>
                  }
              >
                컬럼 {columns.length}개
              </SectionLabel>
              <ColumnList
                columns={columns}
                onTypeChange={onColumnTypeChange}
                gapSources={gapSources}
                onDeriveGap={onDeriveGap}
              />
            </section>
          )}

          {/*
            차트가 여러 장이면 아래 설정이 "그중 어느 장"의 것인지 먼저 말해야 한다.
            한 장뿐일 때는 물을 것이 없으니 띄우지 않는다.
          */}
          {chartCount > 1 && (
            <div className="flex items-center gap-2 border-t border-border pt-5">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-foreground text-[11px] font-semibold text-background tabular-nums">
                {chartNumber}
              </span>
              <h2 className="text-xs font-medium">차트 {chartNumber}</h2>
              <span className="ml-auto text-[11px] text-muted-foreground">카드를 눌러 전환</span>
            </div>
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
            <SectionLabel hint={<MappingGuide chartType={chartType} />}>매핑</SectionLabel>
            <div className="space-y-2">
              {MAPPING_SLOTS[chartType].map((slot) => (
                <MappingSelect
                  key={slot.key}
                  slot={slot}
                  columns={columns}
                  value={mapping[slot.key]}
                  locked={lockedReason(slot, chartType, mapping, aggregation === "count")}
                  onValueChange={(column) => onMappingChange(slot.key, column)}
                />
              ))}
              {/* 산점도·궤적은 행이 곧 점이고, 히스토그램은 언제나 개수라 고를 게 없다. */}
              {usesAggregation(chartType) && (
                <div className="grid grid-cols-[5rem_minmax(0,1fr)] items-center gap-2">
                  <Label htmlFor="aggregation" className="text-xs text-muted-foreground">
                    집계
                  </Label>
                  <Select
                    value={aggregation}
                    onValueChange={(next) => onAggregationChange(next as Aggregation)}
                    disabled={columns.length === 0}
                  >
                    <SelectTrigger id="aggregation" size="sm" className="w-full min-w-0 text-xs">
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
          <li>기기에 저장되지 않습니다.</li>
          <li>새로고침하면 초기화됩니다.</li>
        </ul>
      </div>
    </aside>
  )
}
