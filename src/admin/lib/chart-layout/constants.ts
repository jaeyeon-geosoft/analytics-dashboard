import { GRID_COLS } from "@/shared/lib/dashboard"

/**
 * 새 카드가 놓이는 자리. 한 줄에 두 장이고, `h`는 종전 캔버스의 행 높이(26rem)에
 * 맞춘 값이다 — 8칸 = 8*40 + 7*12 = 404px.
 */
export const DEFAULT_W = GRID_COLS / 2
export const DEFAULT_H = 8

/**
 * 카드가 한 장뿐이면 **폭을 다 쓴다.**
 *
 * 절반짜리로 두면 파일을 처음 열었을 때 오른쪽 절반이 통째로 비고, 폭을 다 쓰는 파일
 * 바와 어긋나 화면이 덜 만들어진 것처럼 보인다. 첫 화면이 그 상태라 인상이 거기서 굳는다.
 * 세로도 종전(404px)보다 키워 캔버스를 채운다.
 *
 * 차트를 추가하면 이 카드는 **반으로 갈라져 새 카드를 옆에 들인다**(`syncLayout`).
 * 그 뒤로는 사용자가 잡은 크기를 건드리지 않는다.
 */
export const SOLO_W = GRID_COLS

/** 캔버스를 아직 못 쟀을 때의 값. 종전 카드 높이(404px)보다 조금 큰 정도. */
export const SOLO_H = 10

/** 한 줄에 서는 카드 수. 새 카드가 갈 열을 정하는 데 쓴다. */
export const PER_ROW = 2
