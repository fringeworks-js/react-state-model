'use client';

import useChangeLayoutEffect from '@fringeworks/react-utils/hooks/useChangeLayoutEffect';
import {
  createDerivedList,
  type DerivedList,
  type ListSource,
} from '@fringeworks/state-model';
import { useState } from 'react';
import useWarnIfSourceChanged from '../_internal/_useWarnIfSourceChanged';
import type { UseDerivedListOptions } from './types';

/**
 * 一覧を絞り込み・並べ替えた、標準の派生モデルを作る hook
 *
 * - 派生モデルは最初の描画で作り、以後は同じものを返す。上流も最初の描画のものにつないだまま（変えたいときは `key` で作り直す）
 * - 条件（`filter`・`sort`）と当て直すか（`filterRefresh`・`sortRefresh`）が変わったら、描画の後（`useLayoutEffect`）に差し替える。
 *   条件の関数は参照で比べるので、描画のたびに作らず、`useCallback` かモジュールの関数を使う
 * - `refreshOn` の値が変わったら、描画の後に当て直す
 *
 * @param source 上流のモデル（`ListModel` か `DerivedList`）
 * @param options 絞り込み・並べ替えの条件と、当て直すか
 * @returns 派生モデル
 */
export default function useDerivedList<
  E,
  S extends ListSource<E> = ListSource<E>,
>(
  source: S & ListSource<E>,
  options: UseDerivedListOptions<E> = {},
): DerivedList<E, S> {
  const { filter, sort, filterRefresh, sortRefresh, refreshOn } = options;
  const [model] = useState(() =>
    createDerivedList<E, S>(source, {
      filter,
      sort,
      filterRefresh,
      sortRefresh,
    }),
  );
  useChangeLayoutEffect({ filter }, () => model.setFilter(filter));
  useChangeLayoutEffect({ sort }, () => model.setSort(sort));
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
