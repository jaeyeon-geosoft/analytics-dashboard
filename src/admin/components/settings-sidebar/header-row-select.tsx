import { Label } from "@/shared/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select"
import { ROW } from "@/admin/components/settings-sidebar/constants"
import { Hint } from "@/admin/components/settings-sidebar/hint"

/** 미리보기에서 보여줄 셀 수. 세 개면 그 줄이 무엇인지 알아볼 수 있다. */
const SUMMARY_CELLS = 3

/** 헤더 행을 고를 때 그 줄에 뭐가 들어 있는지 보여준다. 번호만으로는 못 고른다. */
function rowSummary(cells: string[]): string {
  const filled = cells.map((cell) => cell.trim()).filter(Boolean)
  if (filled.length === 0) return "(비어 있음)"
  const summary = filled.slice(0, SUMMARY_CELLS).join(", ")
  return filled.length > SUMMARY_CELLS ? `${summary}…` : summary
}

/** 헤더가 1행이 아닌 파일(제목 줄이 위에 붙은 리포트)을 위한 선택. */
export function HeaderRowSelect({
  datasetId,
  headerRow,
  preview,
  onChange,
}: {
  datasetId: string
  /** 1부터. 파일에서 세는 줄 번호와 같다. */
  headerRow: number
  /** 앞부분 원본 행. 이 목록이 곧 후보다. */
  preview: string[][]
  onChange: (row: number) => void
}) {
  const id = `header-row-${datasetId}`

  return (
    <div className={ROW}>
      <div className="flex items-center gap-1">
        <Label htmlFor={id} className="text-xs text-muted-foreground">
          헤더 행
        </Label>
        <Hint>
          컬럼 이름이 적힌 줄입니다.
          <br />
          제목 줄이 위에 붙은 파일만 바꾸면 됩니다.
        </Hint>
      </div>
      <Select value={String(headerRow)} onValueChange={(next) => onChange(Number(next))}>
        <SelectTrigger id={id} size="sm" className="w-full min-w-0 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {preview.map((cells, index) => (
            <SelectItem key={index} value={String(index + 1)} className="text-xs">
              <span className="shrink-0 text-muted-foreground">{index + 1}행</span>
              {/* 트리거 안에서는 이 줄이 좁은 사이드바를 넘치면 안 된다. */}
              <span className="ml-1.5 min-w-0 truncate font-mono">{rowSummary(cells)}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
