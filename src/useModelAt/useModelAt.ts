'use client';

import type {
  ReadonlyModel,
  RecordId,
  UnknownModel,
} from '@fringeworks/state-model';
import { useEffect } from 'react';
import useScope from '../_internal/_useScope';
import _warn from '../_internal/_warn';
import type { ModelTarget } from './types';

/**
 * `at()` を持つモデルか
 */
function hasAt(
  model: ReadonlyModel<unknown>,
): model is ReadonlyModel<unknown> & {
  at(path: readonly RecordId[]): UnknownModel;
} {
  return typeof (model as { at?: unknown }).at === 'function';
}

/**
 * 基準のモデルからの相対的なキーと id のパスで、下位のモデルを取り出す hook（購読しない。値は `useModelValue` で読む）
 *
 * 基準のモデルは、未指定なら最寄りのスコープ（`ModelScope`）のモデル、文字列なら id が一致するスコープのモデル、
 * モデルならそのモデル。基準のモデルが見つからないときと、`at()` を持たないモデル（Field のモデル・`ids()` の戻り値）の
 * ときは undefined を返し、開発時に警告する。
 * 戻り値のモデルの種類は実行時に決まるので、`kind` で絞り込む
 *
 * @param path 基準のモデルからのキーと id のパス
 * @param target 基準にするモデルの指定
 * @returns 下位のモデル
 */
export default function useModelAt(
  path: readonly RecordId[],
  target?: ModelTarget,
): UnknownModel | undefined {
  const isModel = typeof target === 'object';
  // hook は条件付きで呼べないため、モデルを指定した場合も呼んでおく
  const scoped = useScope(isModel ? undefined : target, !isModel);
  const base = isModel ? target : scoped;
  const unsupported = base !== undefined && !hasAt(base);

  useEffect(() => {
    if (unsupported) {
      _warn(
        'The base model of useModelAt has no at() (a Field model or the model returned by ids()).',
      );
    }
  }, [unsupported]);

  return base !== undefined && hasAt(base) ? base.at(path) : undefined;
}
