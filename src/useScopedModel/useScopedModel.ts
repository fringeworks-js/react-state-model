'use client';

import type { ReadonlyModel } from '@fringeworks/state-model';
import useScope from '../_internal/_useScope';

/**
 * スコープ（`ModelScope`）が配るモデルを取り出す hook（購読しない。値は `useModelValue` で読む）
 *
 * 見つからなければ undefined を返し、開発時に警告する。
 * Context を通すのでモデルの型は失われる。型は型引数で指定する（例: `useScopedModel<RecordModel<Order>>()`）
 *
 * @param id スコープの id。未指定なら最寄りのスコープ
 * @returns スコープのモデル
 */
export default function useScopedModel<
  M extends ReadonlyModel<unknown> = ReadonlyModel<unknown>,
>(id?: string): M | undefined {
  return useScope(id) as M | undefined;
}
