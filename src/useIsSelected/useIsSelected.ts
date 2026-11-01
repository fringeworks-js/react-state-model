'use client';

import type { ListSelection, RecordId } from '@fringeworks/state-model';
import { useCallback, useSyncExternalStore } from 'react';

const subscribeNothing = () => () => {};

/**
 * 行を選んでいるかを読み、変わったら描画し直す hook
 *
 * 行ごとに真偽値を読むので、選択を変えても、選ばれ方が変わった行だけが描画し直す
 * （各行で `useModelValue(selection)` を読むと、選択が変わるたびに全部の行が描画し直す）。
 * 選択のモデルが undefined なら false を返す
 *
 * @param selection 選択のモデル
 * @param id 行の id
 * @returns 選んでいるか
 */
export default function useIsSelected(
  selection: Pick<ListSelection<unknown>, 'has' | 'subscribe'> | undefined,
  id: RecordId,
): boolean {
  const getSnapshot = useCallback(
    () => selection?.has(id) ?? false,
    [selection, id],
  );
  return useSyncExternalStore(
    selection?.subscribe ?? subscribeNothing,
    getSnapshot,
    getSnapshot,
  );
}
