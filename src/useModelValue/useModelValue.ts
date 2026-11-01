'use client';

import type { ReadonlyModel } from '@fringeworks/state-model';
import { useSyncExternalStore } from 'react';

/**
 * モデルが無いときの購読（何もしない）
 */
const subscribeNothing = () => () => {};

/**
 * モデルが無いときの値
 */
const getNothing = () => undefined;

/**
 * モデルの値を読み、変わったら描画し直す hook
 *
 * `get()` の値（参照）が変わったときだけ描画し直す。
 * 一覧で id の並びだけを読むときは `useModelValue(list.ids())` と書く。
 * モデルが undefined なら undefined を返す（`useModelAt` などで、モデルが見つからなかったとき。hook は条件付きで呼べないため）
 *
 * @param model 値を読むモデル（`ListModel`・`RecordModel`・`FieldModel`・`ids()` の戻り値など）
 * @returns モデルの今の値
 */
export default function useModelValue<V>(model: ReadonlyModel<V>): V;
export default function useModelValue<V>(
  model: ReadonlyModel<V> | undefined,
): V | undefined;
export default function useModelValue<V>(
  model: ReadonlyModel<V> | undefined,
): V | undefined {
  const get = model?.get ?? getNothing;
  return useSyncExternalStore(model?.subscribe ?? subscribeNothing, get, get);
}
