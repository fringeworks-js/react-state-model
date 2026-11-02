'use client';

import {
  createModelStatus,
  type ModelStatus,
  type ModelStatusSource,
} from '@fringeworks/state-model';
import { useState } from 'react';
import useWarnIfSourceChanged from '../_internal/_useWarnIfSourceChanged';

/**
 * 状態のモデル（変更済みか）を作る hook
 *
 * 状態のモデルは最初の描画で作り、以後は同じものを返す。つなぐモデルも、最初の描画のものを使い続ける
 * （変えたいときは `key` で作り直す）。基準のデータは、最初の描画のときのデータになる。
 * 値は `useModelValue(status.dirty(path))` のように読む
 *
 * @param source つなぐモデル（Record・List のモデル。ルートでも下位でもよい）
 * @returns 状態のモデル
 */
export default function useModelStatus<M extends ModelStatusSource>(
  source: M,
): ModelStatus<M> {
  const [status] = useState(() => createModelStatus(source));
  useWarnIfSourceChanged(source, status.source);
  return status;
}
