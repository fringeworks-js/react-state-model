'use client';

import {
  createListModel,
  type ListDefinition,
  type ListModel,
  type ListModelOptions,
  type ModelRoot,
} from '@fringeworks/state-model';
import useRootModel from '../_internal/_useRootModel';

/**
 * List のルートのモデルを作る hook（一覧など）
 *
 * - 非制御: `{ defaultData }` を渡すと、データをモデルの中に持つ
 * - 制御: `{ data, onChangeData }` を渡すと、書き込みを `onChangeData` でデータの持ち主に依頼する。
 *   `data` が変わったら、描画の後にモデルに渡す
 *
 * モデルは最初の描画で作り、以後は同じものを返す。定義も最初の描画のものを使い続ける（変えたいときは `key` で作り直す）
 *
 * @param definition List の定義
 * @param options データの持ち方
 * @returns ルートのモデル
 */
export default function useListModel<E>(
  definition: ListDefinition<E>,
  options: ListModelOptions<E>,
): ListModel<E> & ModelRoot<readonly E[]> {
  return useRootModel(
    (rootOptions) =>
      createListModel<E>(definition, rootOptions as ListModelOptions<E>),
    options,
  );
}
