/**
 * 읽은 것을 어디에 놓을지. `loadFile`의 세 갈래가 여기서 갈린다.
 *
 * - `open` — 새로 연 파일. 데이터셋을 들이고 그걸 보는 카드를 한 장 만든다.
 * - `reread` — 같은 데이터셋을 다른 헤더 행으로 다시 읽는다. **제자리 교체**라
 *   그 데이터셋을 보는 카드가 전부 따라 바뀐다(그게 맞다 — 같은 표를 다시 읽은 것).
 * - `bind` — **그 카드만** 새 데이터셋으로 옮긴다. 시트를 바꿀 때 쓴다. 시트가 다르면
 *   컬럼도 행도 다른 **다른 표**라, 제자리 교체하면 같은 파일을 보던 다른 카드까지
 *   끌려간다(실제로 그랬다).
 */
export type LoadTarget =
  | { kind: "open" }
  | { kind: "reread"; datasetId: string }
  | { kind: "bind"; chartId: string; fileId: string }
