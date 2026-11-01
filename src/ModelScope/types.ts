import type { ReadonlyModel } from '@fringeworks/state-model';
import type { PropsWithChildren } from 'react';

/**
 * `ModelScope` のプロパティ
 */
export type ModelScopeProps = PropsWithChildren<{
  /**
   * 子孫に配るモデル（ルートのモデル、下位のモデル、派生モデルのどれでもよい）
   */
  model: ReadonlyModel<unknown>;

  /**
   * スコープの id。hook に id を渡すと、id が一致する最寄りのスコープのモデルを使う
   */
  id?: string;
}>;
