'use client';

import type { ReadonlyModel } from '@fringeworks/state-model';
import { useSyncExternalStore } from 'react';

/**
 * モデルの値を読み、変わったら描画し直す hook
 *
 * `get()` の値（参照）が変わったときだけ描画し直す。
 * 一覧で id の並びだけを読むときは `useModelValue(list.ids())` と書く。
 *
 * @param model 値を読むモデル（`ListModel`・`RecordModel`・`FieldModel`・`ids()` の戻り値など）
 * @returns モデルの今の値
 */
export default function useModelValue<V>(model: ReadonlyModel<V>): V {
  return useSyncExternalStore(model.subscribe, model.get, model.get);
}
