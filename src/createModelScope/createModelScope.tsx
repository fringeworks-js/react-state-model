'use client';

import type { ReadonlyModel } from '@fringeworks/state-model';
import { createContext, useContext, useEffect } from 'react';
import _warn from '../_internal/_warn';
import type { TypedModelScope, TypedModelScopeProps } from './types';

/**
 * 型付きのスコープ（スコープの部品と、モデルを取り出す hook の組）を作る
 *
 * `ModelScope` と違い、モデルの型が保たれる。コードで書く部品は、取り出したモデルから
 * `list()`・`record()`・`field()` でたどれば、最後まで型が付く。
 * スコープごとに別の Context を作るので、`ModelScope`・`useScopedModel`・`useModelAt` の id では探せない
 * （`useModelAt(path, Scope.useModel())` のように、取り出したモデルを渡す）。
 * モジュールの最上位で作り、部品から import して使う
 *
 * @returns 型付きのスコープ
 */
export default function createModelScope<
  M extends ReadonlyModel<unknown>,
>(): TypedModelScope<M> {
  const ScopeContext = createContext<M | undefined>(undefined);

  function Provider({ model, children }: TypedModelScopeProps<M>) {
    return (
      <ScopeContext.Provider value={model}>{children}</ScopeContext.Provider>
    );
  }

  function useModel(): M | undefined {
    const model = useContext(ScopeContext);
    const missing = model === undefined;
    useEffect(() => {
      if (missing) {
        _warn('No Provider of the typed model scope was found.');
      }
    }, [missing]);
    return model;
  }

  return { Provider, useModel };
}
