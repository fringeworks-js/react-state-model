'use client';

import { useContext, useMemo } from 'react';
import ModelScopeContext from '../_internal/_ModelScopeContext';
import type { ModelScopeProps } from './types';

/**
 * 子孫のコンポーネントにモデルを配るスコープ
 *
 * 入れ子にした場合、hook は最寄りのスコープのモデルを使う。
 * hook に id を渡した場合は、スコープを遡って id が一致するスコープのモデルを使う。
 */
export default function ModelScope(props: ModelScopeProps) {
  const { model, id, children } = props;
  const parent = useContext(ModelScopeContext);
  const value = useMemo(() => ({ model, id, parent }), [model, id, parent]);

  return (
    <ModelScopeContext.Provider value={value}>
      {children}
    </ModelScopeContext.Provider>
  );
}
