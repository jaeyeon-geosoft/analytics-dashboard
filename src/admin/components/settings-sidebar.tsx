import { useState } from "react"
import { AlertTriangle, Info, Plus, X } from "lucide-react"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/shared/components/ui/accordion"
import { Button } from "@/shared/components/ui/button"
import { Label } from "@/shared/components/ui/label"
import { ScrollArea } from "@/shared/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/components/ui/tooltip"
import { ChartTypePicker } from "@/admin/components/chart-type-picker"
import { ColumnList } from "@/admin/components/column-list"
import {
  AGGREGATION_LABELS,
  ORDER_LABELS,
  REFERENCE_LABELS,
  type Aggregation,
  type CategoryOrder,
  type Reference,
} from "@/shared/lib/aggregate"
import { datasetLabel, type AdminChart, type AdminDataset } from "@/admin/lib/canvas-state"
import { withChartType, withMapping, type ChartSpec } from "@/shared/lib/chart-spec"
import type { ChartType } from "@/shared/lib/chart-types"
import { canDeriveGap, gapColumnName } from "@/admin/lib/derive-column"
import { ACCEPT_ATTR, formatBytes } from "@/admin/lib/file-constraints"
import {
  COLUMN_TYPE_LABELS,
  columnWarning,
  type ColumnInfo,
  type ColumnType,
} from "@/shared/lib/infer-types"
import {
  MAPPING_SLOTS,
  allowsReference,
  candidatesFor,
  isTimeline,
  lockedReason,
  type MappingSlot,
  usesAggregation,
} from "@/shared/lib/mapping-slots"
import { cn } from "@/shared/lib/utils"

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
function MappingGuide({ chartType, sortable }: { chartType: ChartType; sortable: boolean }) {
  const rows = MAPPING_SLOTS[chartType].map((slot) => [slot.label, slot.hint] as const)
  if (usesAggregation(chartType)) {
    rows.push(["집계", "같은 범주가 여러 줄일 때 합칠 방법"])
  }
  if (sortable) {
    rows.push(["정렬", "범주를 세우는 순서. 기본은 파일에 있는 그대로입니다"])
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

/** 라벨 + 선택지 한 줄. 격자가 어긋나면 라벨과 Select의 짝이 안 보인다. */
const ROW = "grid grid-cols-[5rem_minmax(0,1fr)] items-center gap-2"

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
    <div className={ROW}>
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

/** 집계·기준선처럼 선택지가 고정된 줄. 매핑과 같은 격자에 선다. */
function ChoiceRow<T extends string>({
  id,
  label,
  value,
  labels,
  disabled,
  onValueChange,
}: {
  id: string
  label: string
  value: T
  /** 값 → 화면에 보일 이름. 키 순서가 곧 목록 순서다. */
  labels: Record<T, string>
  disabled?: boolean
  onValueChange: (value: T) => void
}) {
  return (
    <div className={ROW}>
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </Label>
      <Select value={value} onValueChange={(next) => onValueChange(next as T)} disabled={disabled}>
        <SelectTrigger id={id} size="sm" className="w-full min-w-0 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {(Object.keys(labels) as T[]).map((option) => (
            <SelectItem key={option} value={option} className="text-xs">
              {labels[option]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

/**
 * 카드 번호.
 *
 * 이 배지는 세 곳에 **같은 모양으로** 선다 — 파일 목록(이 파일을 쓰는 카드), 사이드바
 * 머리줄(지금 편집 중인 카드), 캔버스 카드. 셋이 같은 번호로 꿰여야 "어느 파일이 어느
 * 카드로 가는지"가 글로 설명하지 않아도 읽힌다. 파일을 닫을 때 무엇이 함께 사라지는지도
 * 여기서 보인다.
 */
function CardBadge({ number, current }: { number: number; current?: boolean }) {
  return (
    <span
      className={cn(
        "flex size-5 shrink-0 items-center justify-center rounded-md text-[11px] font-semibold tabular-nums",
        current ? "bg-foreground text-background" : "bg-muted text-muted-foreground"
      )}
    >
      {number}
    </span>
  )
}

/** 파일 하나에 대해 사용자가 확인해야 할 것들. 접혀 있어도 ⚠로 보인다. */
function fileNotes(dataset: AdminDataset): string[] {
  const uncertain = dataset.columns.filter((column) => columnWarning(column) !== null).length
  return [
    dataset.data.truncated && "행 상한에 걸려 뒷부분을 읽지 않았습니다.",
    dataset.data.errorCount > 0 &&
      `${dataset.data.errorCount.toLocaleString()}개 행이 헤더와 모양이 다릅니다.`,
    uncertain > 0 && `컬럼 ${uncertain}개의 타입을 확인해 주세요.`,
  ].filter((note): note is string => typeof note === "string")
}

/**
 * 열어둔 파일 하나. 접으면 이름·크기·이 파일을 쓰는 카드만 남고, 펼치면 그 파일을
 * 어떻게 읽을지(시트·헤더 행)와 컬럼 타입이 나온다.
 *
 * 닫기 버튼은 **트리거 바깥 형제**로 둔다. 트리거 안에 넣으면 버튼 안의 버튼이 되고,
 * `asChild`로 겹치면 Radix가 `data-state`를 덮어써 펼침 상태가 죽는다(CLAUDE.md).
 */
function FileRow({
  dataset,
  users,
  currentChartId,
  onColumnTypeChange,
  onDeriveGap,
  onHeaderRowChange,
  onClose,
}: {
  dataset: AdminDataset
  /** 이 파일을 보고 있는 카드들. 번호는 캔버스의 카드 순서다. */
  users: { number: number; id: string }[]
  currentChartId?: string
  onColumnTypeChange: (datasetId: string, name: string, type: ColumnType) => void
  onDeriveGap: (datasetId: string, name: string) => void
  onHeaderRowChange: (datasetId: string, row: number) => void
  onClose: () => void
}) {
  const { data, columns } = dataset
  const notes = fileNotes(dataset)

  // 시차를 만들 수 있는 컬럼: 시각이 든 날짜 컬럼이고, 아직 안 만든 것.
  const names = new Set(columns.map((column) => column.name))
  const gapSources = new Set(
    columns
      .filter(
        (column) =>
          column.type === "date" &&
          !names.has(gapColumnName(column.name)) &&
          canDeriveGap(data.rows, column.name)
      )
      .map((column) => column.name)
  )

  const label = datasetLabel(dataset)
  const closeLabel =
    users.length > 0
      ? `${label} 닫기 — 차트 ${users.map((user) => user.number).join(", ")}도 함께 사라집니다`
      : `${label} 닫기`

  return (
    <AccordionItem value={dataset.id} className="relative">
      {/*
        `pr-10`은 셰브론이 설 자리다. 셰브론은 트리거 콘텐츠의 끝(오른쪽에서 40~56px)에
        서고 닫기 버튼은 그 바깥(12~28px)에 선다 — 둘을 눈대중으로 두면 겹쳐서 어느 쪽을
        눌렀는지 모르게 된다.
      */}
      <AccordionTrigger className="gap-2 px-4 py-3 pr-10 hover:no-underline">
        <span className="min-w-0 flex-1">
          <span className="block truncate font-mono text-xs" title={label}>
            {label}
          </span>
          <span className="mt-1 flex items-center gap-1.5">
            <span className="min-w-0 truncate font-mono text-[11px] font-normal text-muted-foreground">
              {formatBytes(dataset.size)}
              {` · ${data.rows.length.toLocaleString()}행`}
              {/* Excel은 인코딩 개념이 없어서 null이다. */}
              {data.encoding && data.encoding !== "utf-8" && ` · ${data.encoding.toUpperCase()}`}
            </span>
            {notes.length > 0 && (
              <AlertTriangle className="size-3 shrink-0 text-muted-foreground" />
            )}
            <span className="ml-auto flex shrink-0 gap-1">
              {users.map((user) => (
                <CardBadge key={user.id} number={user.number} current={user.id === currentChartId} />
              ))}
            </span>
          </span>
        </span>
      </AccordionTrigger>
      <button
        type="button"
        onClick={onClose}
        aria-label={closeLabel}
        title={closeLabel}
        className="absolute top-3 right-3 rounded text-muted-foreground hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <X className="size-4" />
      </button>

      <AccordionContent className="space-y-2 pb-3">
        {notes.length > 0 && (
          <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-muted-foreground">
            <AlertTriangle className="mt-px size-3 shrink-0" />
            <span>{notes.join(" ")}</span>
          </p>
        )}

        {/* 헤더가 1행이 아닌 파일(제목 줄이 위에 붙은 리포트)을 위한 선택. */}
        {data.preview.length > 1 && (
          <div className={ROW}>
            <div className="flex items-center gap-1">
              <Label htmlFor={`header-row-${dataset.id}`} className="text-xs text-muted-foreground">
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
              onValueChange={(next) => onHeaderRowChange(dataset.id, Number(next))}
            >
              <SelectTrigger
                id={`header-row-${dataset.id}`}
                size="sm"
                className="w-full min-w-0 text-xs"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {data.preview.map((cells, index) => (
                  <SelectItem key={index} value={String(index + 1)} className="text-xs">
                    <span className="shrink-0 text-muted-foreground">{index + 1}행</span>
                    {/* 트리거 안에서는 이 줄이 좁은 사이드바를 넘치면 안 된다. */}
                    <span className="ml-1.5 min-w-0 truncate font-mono">{rowSummary(cells)}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/*
          시트 선택은 여기 없다 — **카드 설정 쪽**에 있다. 시트가 다르면 컬럼도 행도
          다른 다른 표라서, 파일 자리에서 바꾸면 같은 파일을 보던 다른 카드까지 함께
          끌려간다(실제로 그랬다). 여기 남은 것은 이 표를 어떻게 읽을지(헤더 행)뿐이다.
        */}

        {columns.length > 0 && (
          <div>
            <div className="mt-1 mb-1.5 flex items-center gap-1.5">
              <h3 className="text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                컬럼 {columns.length}개
              </h3>
              <Hint>
                컬럼의 값이 맞는지 확인하세요.
                <br />이 파일을 쓰는 차트의 선택지가 함께 바뀝니다.
              </Hint>
            </div>
            <ColumnList
              columns={columns}
              onTypeChange={(name, type) => onColumnTypeChange(dataset.id, name, type)}
              gapSources={gapSources}
              onDeriveGap={(name) => onDeriveGap(dataset.id, name)}
            />
          </div>
        )}
      </AccordionContent>
    </AccordionItem>
  )
}

/** 파일을 고르는 버튼. `<input type=file>`은 감춰두고 라벨이 버튼 노릇을 한다. */
function OpenFileButton({
  onFile,
  children,
}: {
  onFile: (file: File) => void
  children: React.ReactNode
}) {
  return (
    <Button asChild variant="outline" size="sm" className="mt-2 w-full">
      <label className="cursor-pointer">
        {children}
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
  )
}

/**
 * 선택된 카드가 무엇을 그리는지. 카드가 없으면(파일 열기 전) 통째로 빠진다 —
 * 고를 컬럼이 없는데 빈 선택지만 늘어놓을 이유가 없다.
 */
function ChartSettings({
  chart,
  columns,
  datasets,
  dataset,
  onChartChange,
  onFileChange,
  onSheetChange,
}: {
  chart: ChartSpec
  columns: ColumnInfo[]
  /** 열어둔 데이터셋 전부. 파일 선택은 여기서 **파일 단위로 묶어** 만든다. */
  datasets: AdminDataset[]
  /** 이 카드가 보고 있는 것 */
  dataset: AdminDataset
  onChartChange: (next: ChartSpec) => void
  onFileChange: (fileId: string) => void
  onSheetChange: (sheet: string) => void
}) {
  const { chartType, mapping, aggregation, reference } = chart

  /*
    정렬을 고를 수 있는 차트인가.

    범주 축을 세우는 종류(막대 3종·원형)이면서 그 컬럼이 **범주**일 때만이다. 날짜·숫자
    축과 시계열(선·영역)은 축 자체가 순서라 정렬이 끼어들 자리가 없고, 산점도·궤적은
    범주로 묶지도 않는다.
  */
  const categoryType = columns.find((column) => column.name === mapping.category)?.type
  const sortable = usesAggregation(chartType) && !isTimeline(chartType) && categoryType === "category"

  // 파일 단위로 접는다 — 같은 파일의 시트 둘은 데이터셋이 둘이지만 파일은 하나다.
  const files = datasets.filter(
    (entry, index) => datasets.findIndex((other) => other.fileId === entry.fileId) === index
  )
  const sheets = dataset.data.sheets

  return (
    <>
      {/* 고를 것이 둘 이상일 때만 내놓는다 — 시트도 같은 규칙이다. */}
      {(files.length > 1 || sheets.length > 1) && (
        <section className="space-y-2">
          {files.length > 1 && (
            <div className={ROW}>
              <Label htmlFor="chart-file" className="text-xs text-muted-foreground">
                파일
              </Label>
              <Select value={dataset.fileId} onValueChange={onFileChange}>
                <SelectTrigger id="chart-file" size="sm" className="w-full min-w-0 font-mono text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {files.map((entry) => (
                    <SelectItem
                      key={entry.fileId}
                      value={entry.fileId}
                      className="font-mono text-xs"
                    >
                      {entry.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {/*
            시트는 **카드마다** 고른다. 파일 쪽에 두면 같은 파일을 보는 카드가 전부 함께
            바뀐다 — 시트가 다르면 컬럼도 행도 다른 다른 표인데도 그랬다.
          */}
          {sheets.length > 1 && (
            <div className={ROW}>
              <Label htmlFor="chart-sheet" className="text-xs text-muted-foreground">
                시트
              </Label>
              <Select value={dataset.data.sheet ?? undefined} onValueChange={onSheetChange}>
                <SelectTrigger
                  id="chart-sheet"
                  size="sm"
                  className="w-full min-w-0 font-mono text-xs"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sheets.map((name) => (
                    <SelectItem key={name} value={name} className="font-mono text-xs">
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </section>
      )}

      <section>
        <SectionLabel>차트 종류</SectionLabel>
        <ChartTypePicker
          value={chartType}
          onValueChange={(next) => onChartChange(withChartType(chart, next, columns))}
        />
      </section>

      <section>
        <SectionLabel hint={<MappingGuide chartType={chartType} sortable={sortable} />}>
          매핑
        </SectionLabel>
        <div className="space-y-2">
          {MAPPING_SLOTS[chartType].map((slot) => (
            <MappingSelect
              key={slot.key}
              slot={slot}
              columns={columns}
              value={mapping[slot.key]}
              locked={lockedReason(slot, chartType, mapping, aggregation === "count")}
              onValueChange={(column) => onChartChange(withMapping(chart, slot.key, column))}
            />
          ))}
          {/* 산점도·궤적은 행 하나가 점 하나라 묶을 일이 없다. */}
          {usesAggregation(chartType) && (
            <ChoiceRow<Aggregation>
              id="aggregation"
              label="집계"
              value={aggregation}
              labels={AGGREGATION_LABELS}
              onValueChange={(next) => onChartChange({ ...chart, aggregation: next })}
            />
          )}
          {/*
            정렬은 **범주 축일 때만** 내놓는다. 날짜·숫자 축과 시계열은 축 자체가
            순서라 고를 것이 없다 — 빈 선택지를 늘어놓지 않는다.
          */}
          {sortable && (
            <ChoiceRow<CategoryOrder>
              id="order"
              label="정렬"
              value={chart.order ?? "file"}
              labels={ORDER_LABELS}
              onValueChange={(next) => onChartChange({ ...chart, order: next })}
            />
          )}
          {allowsReference(chartType) && (
            <ChoiceRow<Reference>
              id="reference"
              label="기준선"
              value={reference}
              labels={REFERENCE_LABELS}
              onValueChange={(next) => onChartChange({ ...chart, reference: next })}
            />
          )}
        </div>
      </section>
    </>
  )
}

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
  const columns = dataset?.columns ?? []
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
          <section>
            <SectionLabel
              hint={
                <>
                  차트에 쓸 파일입니다.
                  <br />
                  파일을 열면 그 파일을 보는 차트가 한 장 생깁니다.
                  <br />
                  줄 오른쪽의 번호는 그 파일을 쓰고 있는 차트입니다.
                </>
              }
            >
              파일{datasets.length > 0 && ` ${datasets.length}개`}
            </SectionLabel>

            {datasets.length > 0 ? (
              <Accordion type="single" collapsible value={open} onValueChange={setOpen}>
                {datasets.map((entry) => (
                  <FileRow
                    key={entry.id}
                    dataset={entry}
                    users={usersOf(entry.id)}
                    currentChartId={chart?.spec.id}
                    onColumnTypeChange={onColumnTypeChange}
                    onDeriveGap={onDeriveGap}
                    onHeaderRowChange={onHeaderRowChange}
                    onClose={() => onCloseDataset(entry.id)}
                  />
                ))}
              </Accordion>
            ) : (
              <p className="rounded-xl border border-dashed border-border px-3 py-2.5 text-xs text-muted-foreground">
                열린 파일이 없습니다.
              </p>
            )}

            <OpenFileButton onFile={onFile}>
              <Plus />
              파일 열기
            </OpenFileButton>
          </section>

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
              columns={columns}
              datasets={datasets}
              dataset={dataset}
              onChartChange={onChartChange}
              onFileChange={onChartFile}
              onSheetChange={onChartSheet}
            />
          )}
        </div>
      </ScrollArea>

      <div className="border-t border-border p-4">
        {/*
          예전엔 "밖으로 나가지 않는다"고 약속했지만 내보내기가 생기면서 거짓이 됐다.
          특히 셋째 줄 — 내보내는 JSON에는 설정만이 아니라 **데이터 행이 통째로**
          들어간다. 설정만 나가는 줄 알고 공유하면 그게 유출이다.
        */}
        <SectionLabel>데이터 취급</SectionLabel>
        <ul className="space-y-1 border-l border-border pl-3 text-[11px] leading-relaxed text-muted-foreground">
          <li>파싱·집계는 이 브라우저 안에서 합니다.</li>
          <li>새로고침하면 초기화됩니다.</li>
          <li>
            <span className="text-foreground">내보내면 데이터 행까지 함께 나갑니다</span> —
            차트 설정만이 아닙니다.
          </li>
        </ul>
      </div>
    </aside>
  )
}
