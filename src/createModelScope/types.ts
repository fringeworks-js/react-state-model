import type { ReadonlyModel } from '@fringeworks/state-model';
import type { PropsWithChildren, ReactNode } from 'react';

/**
 * 型付きのスコープの、スコープの部品のプロパティ
 */
export type TypedModelScopeProps<M extends ReadonlyModel<unknown>> =
  PropsWithChildren<{
    /**
     * 子孫に配るモデル
     */
    model: M;
  }>;

/**
 * `createModelScope` が作る、型付きのスコープ
 */
export type TypedModelScope<M extends ReadonlyModel<unknown>> = {
  /**
   * 子孫にモデルを配るスコープの部品。入れ子にした場合、`useModel` は最寄りのものを使う
   */
  readonly Provider: (props: TypedModelScopeProps<M>) => ReactNode;

  /**
   * 最寄りの `Provider` のモデルを返す hook（購読しない。値は `useModelValue` で読む）。
   * 見つからなければ undefined を返し、開発時に警告する
   */
  readonly useModel: () => M | undefined;
};
