import { Plus } from "lucide-react"

import { Accordion } from "@/shared/components/ui/accordion"
import { FilePickerButton } from "@/shared/components/file-picker-button"
import { FileRow, type FileUser } from "@/admin/components/settings-sidebar/file-row"
import { SectionLabel } from "@/admin/components/settings-sidebar/section-label"
import type { AdminDataset } from "@/admin/lib/canvas-state"
import { ACCEPT_ATTR } from "@/admin/lib/file-constraints"
import type { ColumnType } from "@/shared/lib/infer-types"

/** 열어둔 파일 목록. 사이드바 위층 전체다 — 아래층은 그중 한 카드의 설정이다. */
export function FileList({
  datasets,
  open,
  onOpenChange,
  usersOf,
  currentChartId,
  onColumnTypeChange,
  onDeriveGap,
  onHeaderRowChange,
  onCloseDataset,
  onFile,
}: {
  datasets: AdminDataset[]
  /** 펼쳐진 파일. 지금 카드가 보는 파일이 들어온다. */
  open: string | undefined
  onOpenChange: (value: string | undefined) => void
  usersOf: (datasetId: string) => FileUser[]
  currentChartId?: string
  onColumnTypeChange: (datasetId: string, name: string, type: ColumnType) => void
  onDeriveGap: (datasetId: string, name: string) => void
  onHeaderRowChange: (datasetId: string, row: number) => void
  onCloseDataset: (datasetId: string) => void
  onFile: (file: File) => void
}) {
  return (
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
        <Accordion type="single" collapsible value={open} onValueChange={onOpenChange}>
          {datasets.map((entry) => (
            <FileRow
              key={entry.id}
              dataset={entry}
              users={usersOf(entry.id)}
              currentChartId={currentChartId}
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

      <FilePickerButton accept={ACCEPT_ATTR} onFile={onFile} className="mt-2 w-full">
        <Plus />
        파일 열기
      </FilePickerButton>
    </section>
  )
}
