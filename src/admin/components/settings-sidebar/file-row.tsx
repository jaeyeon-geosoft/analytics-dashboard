import { AlertTriangle, X } from "lucide-react"

import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/shared/components/ui/accordion"
import { CardBadge } from "@/shared/components/card-badge"
import { ColumnList } from "@/admin/components/column-list"
import { SECTION_HEADING } from "@/admin/components/settings-sidebar/constants"
import { fileNotes } from "@/admin/components/settings-sidebar/file-notes"
import { gapSourcesOf } from "@/admin/components/settings-sidebar/gap-sources"
import { HeaderRowSelect } from "@/admin/components/settings-sidebar/header-row-select"
import { Hint } from "@/admin/components/settings-sidebar/hint"
import { datasetLabel, type AdminDataset } from "@/admin/lib/canvas-state"
import { formatBytes } from "@/admin/lib/file-constraints"
import type { ColumnType } from "@/shared/lib/infer-types"

/** 이 파일을 보고 있는 카드 하나. 번호는 캔버스의 카드 순서다. */
export type FileUser = { number: number; id: string }

/**
 * 열어둔 파일 하나. 접으면 이름·크기·이 파일을 쓰는 카드만 남고, 펼치면 그 파일을
 * 어떻게 읽을지(시트·헤더 행)와 컬럼 타입이 나온다.
 *
 * 닫기 버튼은 **트리거 바깥 형제**로 둔다. 트리거 안에 넣으면 버튼 안의 버튼이 되고,
 * `asChild`로 겹치면 Radix가 `data-state`를 덮어써 펼침 상태가 죽는다(CLAUDE.md).
 *
 * 시트 선택은 여기 없다 — **카드 설정 쪽**에 있다. 시트가 다르면 컬럼도 행도 다른
 * 다른 표라서, 파일 자리에서 바꾸면 같은 파일을 보던 다른 카드까지 함께 끌려간다
 * (실제로 그랬다). 여기 남은 것은 이 표를 어떻게 읽을지(헤더 행)뿐이다.
 */
export function FileRow({
  dataset,
  users,
  currentChartId,
  onColumnTypeChange,
  onDeriveGap,
  onHeaderRowChange,
  onClose,
}: {
  dataset: AdminDataset
  users: FileUser[]
  currentChartId?: string
  onColumnTypeChange: (datasetId: string, name: string, type: ColumnType) => void
  onDeriveGap: (datasetId: string, name: string) => void
  onHeaderRowChange: (datasetId: string, row: number) => void
  onClose: () => void
}) {
  const { data, columns } = dataset
  const notes = fileNotes(dataset)
  const gapSources = gapSourcesOf(dataset)

  const label = datasetLabel(dataset)
  // 시트가 하나뿐이면 이름에 안 붙는다 — `datasetLabel`과 같은 기준을 쓴다.
  const sheetName = data.sheets.length > 1 ? data.sheet : undefined
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

        **`min-w-0`이 없으면 안쪽의 `truncate`가 통째로 무력해진다.** flex 아이템은
        기본이 `min-width: auto`라 긴 파일명의 최소 너비(371px)만큼 버티고, 사이드바
        (253px)를 넘어선 만큼이 잘려 나가면서 셰브론과 닫기 버튼이 화면 밖으로 밀린다 —
        실제로 `AIS_VDM_Graph_Analysis_…`에서 ✕가 사라졌다.
      */}
      <AccordionTrigger className="min-w-0 gap-2 px-4 py-3 pr-10 hover:no-underline">
        <span className="min-w-0 flex-1">
          {/*
            **시트 이름은 자르지 않는다.** 같은 파일의 시트 둘은 이름이 앞부분까지 똑같아서
            통째로 자르면 두 줄이 `AIS_VDM_Graph_Analysi…`로 같아진다 — 눈금 라벨에서
            공통 앞부분을 떼는 것과 같은 이유다(구분되는 정보가 뒤에 있다). 파일명만
            줄이고 시트는 끝에 붙여둔다.
          */}
          <span className="flex min-w-0 items-baseline font-mono text-xs" title={label}>
            <span className="truncate">{dataset.name}</span>
            {sheetName && (
              // 시트 이름도 길 수 있다. 자르지 않으면 파일명을 0까지 밀어낸다 —
              // 줄의 절반까지만 쓰게 두고 그 안에서 자른다.
              <span className="flex max-w-[55%] shrink-0 text-muted-foreground">
                <span className="px-1">›</span>
                <span className="truncate">{sheetName}</span>
              </span>
            )}
          </span>
          <span className="mt-1 flex items-center gap-1.5">
            <span className="min-w-0 truncate font-mono text-[11px] font-normal text-muted-foreground">
              {formatBytes(dataset.size)}
              {` · ${data.rows.length.toLocaleString()}행`}
              {/* Excel은 인코딩 개념이 없어서 null이다. */}
              {data.encoding && data.encoding !== "utf-8" && ` · ${data.encoding.toUpperCase()}`}
            </span>
            {notes.length > 0 && <AlertTriangle className="size-3 shrink-0 text-muted-foreground" />}
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

        {data.preview.length > 1 && (
          <HeaderRowSelect
            datasetId={dataset.id}
            headerRow={data.headerRow}
            preview={data.preview}
            onChange={(row) => onHeaderRowChange(dataset.id, row)}
          />
        )}

        {columns.length > 0 && (
          <div>
            <div className="mt-1 mb-1.5 flex items-center gap-1.5">
              <h3 className={SECTION_HEADING}>컬럼 {columns.length}개</h3>
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
