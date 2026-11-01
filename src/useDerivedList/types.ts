import type { ChangeDependencies } from '@fringeworks/react-utils/hooks/useChangeEffect';
import type { DerivedListOptions } from '@fringeworks/state-model';

/**
 * `useDerivedList` のオプション
 */
export type UseDerivedListOptions<E> = DerivedListOptions<E> & {
  /**
   * 当て直すきっかけ（Change Dependencies）。1段目のプロパティのどれかが変わったら `refresh()` を呼ぶ。
   * 当て直さないモード（`filterRefresh`・`sortRefresh` が `'manual'`）で、編集する行が変わったときなどに当て直すのに使う
   */
  refreshOn?: ChangeDependencies;
};
