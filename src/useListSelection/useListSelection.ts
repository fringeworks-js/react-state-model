'use client';

import {
  createListSelection,
  type ListSelection,
  type ListSelectionOptions,
  type ListSource,
} from '@fringeworks/state-model';
import { useState } from 'react';
import useWarnIfSourceChanged from '../_internal/_useWarnIfSourceChanged';

/**
 * 一覧の選択のモデルを作る hook
 *
 * 選択のモデルは最初の描画で作り、以後は同じものを返す。上流とオプション（`multiple`・`selectedIds`）も、
 * 最初の描画のものを使い続ける（変えたいときは `key` で作り直す）。
 * 選んだ id を制御（URL・親の state）にしたいときは、`useFieldModel` で作った置き場所を `selectedIds` に渡す
 *
 * @param source 上流のモデル（`ListModel` か、派生モデル）
 * @param options 単一・複数選択と、選んだ id の置き場所
 * @returns 選択のモデル
 */
export default function useListSelection<
  E,
  S extends ListSource<E> = ListSource<E>,
>(
  source: S & ListSource<E>,
  options: ListSelectionOptions = {},
): ListSelection<E, S> {
  const [selection] = useState(() =>
    createListSelection<E, S>(source, options),
  );
  useWarnIfSourceChanged(source, selection.source);
  return selection;
}
