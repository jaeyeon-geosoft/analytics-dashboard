import { ENCODING_PROBE_BYTES } from "@/admin/lib/parse-file/constants"

/** UTF-8 디코더가 못 읽은 바이트 자리에 넣는 문자. 이게 보이면 UTF-8이 아니다. */
const REPLACEMENT = "�"

/**
 * 앞부분을 UTF-8로 디코딩해보고 치환 문자(U+FFFD)가 섞이면 CP949로 본다.
 * 한국 Excel의 "CSV(쉼표로 분리)"가 CP949로 저장되기 때문에 필요하다.
 * `stream: true`는 끝에서 잘린 멀티바이트 문자를 치환 문자로 만들지 않게 한다.
 */
export function detectEncoding(buffer: ArrayBuffer): string {
  const head = buffer.slice(0, ENCODING_PROBE_BYTES)
  const text = new TextDecoder("utf-8").decode(head, { stream: true })
  return text.includes(REPLACEMENT) ? "euc-kr" : "utf-8"
}
