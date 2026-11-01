'use client';

import useChangeLayoutEffect from '@fringeworks/react-utils/hooks/useChangeLayoutEffect';
import {
  createGroupedList,
  type GroupedList,
  type ListSource,
} from '@fringeworks/state-model';
import { useState } from 'react';
import useWarnIfSourceChanged from '../_internal/_useWarnIfSourceChanged';
import type { UseGroupedListOptions } from './types';

/**
 * 一覧をグループに分けた、グループ化した派生モデルを作る hook
 *
 * - 派生モデルは最初の描画で作り、以後は同じものを返す。上流も最初の描画のものにつないだまま（変えたいときは `key` で作り直す）
 * - 条件（`groupBy`・`filterGroups`・`sortGroups`）と当て直すか（`filterRefresh`・`sortRefresh`）が変わったら、
 *   描画の後（`useLayoutEffect`）に差し替える。条件の関数は参照で比べるので、描画のたびに作らず、
 *   `useCallback` かモジュールの関数を使う
 * - `refreshOn` の値が変わったら、描画の後に当て直す
 *
 * @param source 上流のモデル（`ListModel` か `DerivedList`）
 * @param options グループの分け方と、グループの絞り込み・並べ替えの条件、当て直すか
 * @returns 派生モデル
 */
export default function useGroupedList<
  E,
  G extends keyof E & string,
  S extends ListSource<E> = ListSource<E>,
>(
  source: S & ListSource<E>,
  options: UseGroupedListOptions<E, E[G]> & { groupBy: G },
): GroupedList<E[G], E, S>;
export default function useGroupedList<
  E,
  K,
  S extends ListSource<E> = ListSource<E>,
>(
  source: S & ListSource<E>,
  options: UseGroupedListOptions<E, K> & { groupBy: (record: E) => K },
): GroupedList<K, E, S>;
export default function useGroupedList<E, K>(
  source: ListSource<E>,
  options: UseGroupedListOptions<E, K>,
): GroupedList<K, E> {
  const {
    groupBy,
    filterGroups,
    sortGroups,
    filterRefresh,
    sortRefresh,
    refreshOn,
  } = options;
  const [model] = useState(
    () =>
      createGroupedList(source, {
        groupBy: groupBy as (record: E) => K,
        filterGroups,
        sortGroups,
        filterRefresh,
        sortRefresh,
      }) as GroupedList<K, E>,
  );
  useChangeLayoutEffect({ groupBy }, () => model.setGroupBy(groupBy));
  useChangeLayoutEffect({ filterGroups }, () =>
    model.setFilterGroups(filterGroups),
  );
  useChangeLayoutEffect({ sortGroups }, () => model.setSortGroups(sortGroups));
  useChangeLayoutEffect({ filterRefresh }, () =>
    model.setFilterRefresh(filterRefresh ?? 'auto'),
  );
  useChangeLayoutEffect({ sortRefresh }, () =>
    model.setSortRefresh(sortRefresh ?? 'auto'),
  );
  useChangeLayoutEffect(refreshOn, () => model.refresh());
  useWarnIfSourceChanged(source, model.source);
  return model;
}
