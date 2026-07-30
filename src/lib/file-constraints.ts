export const ACCEPTED_EXTENSIONS = [".csv", ".tsv", ".xlsx", ".xls"] as const

export const ACCEPT_ATTR = ACCEPTED_EXTENSIONS.join(",")

/** 브라우저 메모리로 전부 처리하기 때문에 상한을 둔다. 넘으면 탭이 죽는다. */
export const MAX_FILE_BYTES = 50 * 1024 * 1024

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  const units = ["KB", "MB", "GB"]
  let value = bytes / 1024
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit += 1
  }
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[unit]}`
}

/** 통과하면 null, 아니면 사용자에게 보여줄 이유. */
export function validateFile(file: File): string | null {
  const extension = file.name.slice(file.name.lastIndexOf(".")).toLowerCase()
  if (!ACCEPTED_EXTENSIONS.includes(extension as (typeof ACCEPTED_EXTENSIONS)[number])) {
    return `${ACCEPTED_EXTENSIONS.join(", ")} 파일만 열 수 있습니다.`
  }
  if (file.size > MAX_FILE_BYTES) {
    return `파일이 ${formatBytes(MAX_FILE_BYTES)}보다 큽니다. 브라우저에서 처리할 수 있는 한도를 넘습니다.`
  }
  if (file.size === 0) {
    return "파일이 비어 있습니다."
  }
  return null
}
