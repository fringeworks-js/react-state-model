'use client';

import useModelValue from '../useModelValue';
import type { WritableModel } from './types';

/**
 * モデルが無いときのセッター（何もしない）
 */
const setNothing = () => {};

/**
 * モデルの値とセッターを、`useState` と同じ形の組で返す hook
 *
 * 値は `useModelValue` と同じく、変わったら描画し直す。セッターはモデルの `set` そのもので、前の値を受け取る関数も渡せる。
 * 同じモデルなら同じ関数なので、参照が安定する。
 * モデルが undefined なら、値は undefined、セッターは何もしない関数になる（`useModelAt` などで、モデルが見つからなかったとき）
 *
 * @param model 書けるモデル（`FieldModel`・`RecordModel`・`ListModel`）
 * @returns 値とセッターの組
 */
export default function useModelValueState<M extends WritableModel>(
  model: M,
): [ReturnType<M['get']>, M['set']];
export default function useModelValueState<M extends WritableModel>(
  model: M | undefined,
): [ReturnType<M['get']> | undefined, M['set']];
export default function useModelValueState<M extends WritableModel>(
  model: M | undefined,
): [ReturnType<M['get']> | undefined, M['set']] {
  const value = useModelValue(model) as ReturnType<M['get']> | undefined;
  return [value, model?.set ?? (setNothing as M['set'])];
}
