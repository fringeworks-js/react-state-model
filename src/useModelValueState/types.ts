import type { ReadonlyModel } from '@fringeworks/state-model';

/**
 * 書けるモデル（`FieldModel`・`RecordModel`・`ListModel`）。派生モデルと `ids()` の戻り値は `set` を持たないので含まない
 */
export type WritableModel = ReadonlyModel<unknown> & {
  set(value: never): void;
};
