import { COUNT_LABEL } from "@/shared/lib/aggregate"
import { AGGREGATION_LABELS } from "@/shared/lib/chart-option-labels"
import { describeMapping, type ChartSpec } from "@/shared/lib/chart-spec"
import { usesAggregation } from "@/shared/lib/mapping-slots"

export type CardHeading = {
  /** 재는 값. 없으면 아직 컬럼을 안 골랐다는 뜻이다. */
  heading?: string
  /** 제목 뒤에 흐리게 붙는 집계 이름. 집계가 없는 종류에서는 없다. */
  aggregation?: string
  /** 무엇을 기준으로 갈랐는지. 비어 있으면 줄 자체가 서지 않는다. */
  subtitle: string
}

/**
 * 카드 머리줄의 두 층을 낸다.
 *
 * 한 줄로 이어 붙였을 때는 카드가 좁아지면 앞에서부터 잘려서 정작 재는 값이 먼저
 * 사라졌다. 층을 나누면 좁아져도 제목이 마지막까지 남는다.
 *
 * 저장된 제목이 우선. 어드민은 아직 제목이 없어서 **재는 값**이 제목이 된다
 * (개수 집계는 값 컬럼이 없으므로 "행 개수").
 */
export function cardHeading(spec: ChartSpec, title?: string): CardHeading {
  const { axes, aside, measure, by } = describeMapping(spec)
  const counting = usesAggregation(spec.chartType) && spec.aggregation === "count"
  const heading = title ?? measure ?? (counting && by ? COUNT_LABEL : undefined)

  /*
    부제가 제목을 되풀이하지 않게 한다. 지금 내보내기는 제목 자리에 매핑 요약을 그대로
    넣어서(어드민에 제목 입력란이 아직 없다) 그냥 이으면 같은 문장이 두 줄로 선다.

    제목이 저장돼 있으면 매핑 요약 전체를 부제로 내린다 — 제목이 무엇으로 그린
    차트인지까지 말해주지는 않기 때문이다.
  */
  const context = title ? (title === axes ? undefined : axes) : by ? `${by} 기준` : undefined

  return {
    heading,
    // 집계 방식은 화면에 밝힌다. 몇 줄이 한 마크로 접혔는지가 안 보이면 오독한다.
    aggregation:
      heading && usesAggregation(spec.chartType)
        ? AGGREGATION_LABELS[spec.aggregation]
        : undefined,
    subtitle: [context, aside].filter(Boolean).join(" · "),
  }
}
