'use client';

import {
  createModelValidation,
  type ModelValidation,
  type ModelValidationOptions,
  type ModelValidationSource,
  type ReadonlyModel,
} from '@fringeworks/state-model';
import { useState } from 'react';
import useWarnIfSourceChanged from '../_internal/_useWarnIfSourceChanged';

/**
 * 検証のモデルを作る hook
 *
 * 検証のモデルは最初の描画で作り、以後は同じものを返す。つなぐモデルとオプション（`validate`）も、
 * 最初の描画のものを使い続ける（変えたいときは `key` で作り直す）。
 * 結果は `useModelValue(validation.issues(path))` のように読む。いつ結果を見せるかは、画面の側で決める
 *
 * @param source つなぐモデル（Field・Record・List のモデル。ルートでも下位でもよい）
 * @param options つないだモデル全体の規則（Standard Schema か関数）
 * @returns 検証のモデル
 */
export default function useModelValidation<M extends ModelValidationSource>(
  source: M,
  options?: ModelValidationOptions<
    M extends ReadonlyModel<infer V> ? V : unknown
  >,
): ModelValidation<M> {
  const [validation] = useState(() => createModelValidation(source, options));
  useWarnIfSourceChanged(source, validation.source);
  return validation;
}
