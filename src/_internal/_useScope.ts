import type { ReadonlyModel } from '@fringeworks/state-model';
import { useContext, useEffect } from 'react';
import ModelScopeContext from './_ModelScopeContext';
import _warn from './_warn';

/**
 * 最寄りのスコープ（id を渡せば、id が一致する最寄りのスコープ）のモデルを探す hook
 *
 * 見つからなければ undefined を返し、開発時に警告する
 *
 * @param id スコープの id。未指定なら最寄りのスコープ
 * @param enabled false なら探さない（hook は条件付きで呼べないため、呼ぶ側が使わないときに渡す）
 * @returns スコープのモデル
 */
export default function useScope(
  id: string | undefined,
  enabled = true,
): ReadonlyModel<unknown> | undefined {
  const scope = useContext(ModelScopeContext);
  let found = enabled ? scope : undefined;
  while (found !== undefined && id !== undefined && found.id !== id) {
    found = found.parent;
  }
  const missing = enabled && found === undefined;

  useEffect(() => {
    if (missing) {
      _warn(
        id === undefined
          ? 'No ModelScope was found.'
          : `No ModelScope with the id "${id}" was found.`,
      );
    }
  }, [missing, id]);

  return found?.model;
}
