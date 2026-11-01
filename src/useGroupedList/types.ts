import type { ChangeDependencies } from '@fringeworks/react-utils/hooks/useChangeEffect';
import type { GroupedListOptions } from '@fringeworks/state-model';

/**
 * `useGroupedList` のオプション
 */
export type UseGroupedListOptions<E, K> = GroupedListOptions<E, K> & {
  /**
   * 当て直すきっかけ（Change Dependencies）。1段目のプロパティのどれかが変わったら `refresh()` を呼ぶ
   */
  refreshOn?: ChangeDependencies;
};
