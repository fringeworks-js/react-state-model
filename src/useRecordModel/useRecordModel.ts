'use client';

import {
  createRecordModel,
  type ModelRoot,
  type RecordDefinition,
  type RecordModel,
  type RecordModelOptions,
} from '@fringeworks/state-model';
import useRootModel from '../_internal/_useRootModel';

/**
 * Record のルートのモデルを作る hook（フォームなど）
 *
 * - 非制御: `{ defaultData }` を渡すと、データをモデルの中に持つ
 * - 制御: `{ data, onChangeData }` を渡すと、書き込みを `onChangeData` でデータの持ち主に依頼する。
 *   `data` が変わったら、描画の後にモデルに渡す
 *
 * モデルは最初の描画で作り、以後は同じものを返す。定義も最初の描画のものを使い続ける（変えたいときは `key` で作り直す）
 *
 * @param definition Record の定義
 * @param options データの持ち方
 * @returns ルートのモデル
 */
export default function useRecordModel<T>(
  definition: RecordDefinition<T>,
  options: RecordModelOptions<T>,
): RecordModel<T> & ModelRoot<T> {
  return useRootModel(
    (rootOptions) =>
      createRecordModel<T>(definition, rootOptions as RecordModelOptions<T>),
    options,
  );
}
