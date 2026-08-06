import { Label } from "@/shared/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select"
import { ROW } from "@/admin/components/settings-sidebar/constants"
import type { AdminDataset } from "@/admin/lib/canvas-state"

/**
 * 이 카드가 볼 파일과 시트.
 *
 * **고를 것이 둘 이상일 때만 내놓는다** — 파일이 하나뿐이면 고를 게 없는 줄만 늘어난다.
 * 시트가 **카드마다**인 것은 시트가 다르면 컬럼도 행도 다른 다른 표이기 때문이다.
 * 파일 쪽에 두면 같은 파일을 보는 카드가 전부 함께 바뀐다(실제로 그랬다).
 */
export function SourceSelect({
  datasets,
  dataset,
  onFileChange,
  onSheetChange,
}: {
  /** 열어둔 데이터셋 전부. 파일 선택은 여기서 **파일 단위로 묶어** 만든다. */
  datasets: AdminDataset[]
  /** 이 카드가 보고 있는 것 */
  dataset: AdminDataset
  onFileChange: (fileId: string) => void
  onSheetChange: (sheet: string) => void
}) {
  // 파일 단위로 접는다 — 같은 파일의 시트 둘은 데이터셋이 둘이지만 파일은 하나다.
  const files = datasets.filter(
    (entry, index) => datasets.findIndex((other) => other.fileId === entry.fileId) === index
  )
  const sheets = dataset.data.sheets

  if (files.length <= 1 && sheets.length <= 1) return null

  return (
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
                <SelectItem key={entry.fileId} value={entry.fileId} className="font-mono text-xs">
                  {entry.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      {sheets.length > 1 && (
        <div className={ROW}>
          <Label htmlFor="chart-sheet" className="text-xs text-muted-foreground">
            시트
          </Label>
          <Select value={dataset.data.sheet ?? undefined} onValueChange={onSheetChange}>
            <SelectTrigger id="chart-sheet" size="sm" className="w-full min-w-0 font-mono text-xs">
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
  )
}
