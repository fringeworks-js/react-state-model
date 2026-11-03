import useLatestRef from '@fringeworks/react-utils/hooks/useLatestRef';
import type { ModelRoot } from '@fringeworks/state-model';
import { useEffect, useLayoutEffect, useState } from 'react';
import _warn from './_warn';

/**
 * ルートのモデルを作るときのオプション（state-model の `RecordModelOptions` などと同じ形）
 */
type RootModelOptions<D> =
  { defaultData: D } | { data: D; onDataChange: (data: D) => void };

/**
 * ルートのモデルを1回だけ作り、制御のときはデータの持ち主のデータを渡す hook
 *
 * - モデルは最初の描画で作り、以後は同じものを返す（定義も最初の描画のものを使い続ける）
 * - 制御・非制御は最初の描画で決める。途中で切り替わったら開発時に警告する
 * - 制御のとき、データの持ち主が描画し直したその描画の中で、新しいデータを（購読者には知らせずに）受け取り、
 *   描画の後（`useLayoutEffect`）に知らせる。同じ描画の中で子が新しい値を読むので、入力欄の値が古い値に
 *   書き戻されない（書き戻されると、日本語入力などの入力中の文字が壊れる）
 * - `onDataChange` は最新のものを呼ぶ
 *
 * @param create オプションからルートのモデルを作る関数（最初の描画でだけ呼ぶ）
 * @param options データの持ち方
 * @returns ルートのモデル
 */
export default function useRootModel<D, M extends ModelRoot<D>>(
  create: (options: RootModelOptions<D>) => M,
  options: RootModelOptions<D>,
): M {
  const controlled = 'onDataChange' in options;
  const onDataChangeRef = useLatestRef(
    controlled ? options.onDataChange : undefined,
  );
  // ref を読むのは onDataChange が呼ばれたとき（イベントハンドラーの中など）で、描画中には読まないため、lint のエラーは無視する
  // eslint-disable-next-line react-hooks/refs
  const [initial] = useState(() => ({
    controlled,
    model: create(
      controlled
        ? {
            data: options.data,
            onDataChange: (data) => onDataChangeRef.current?.(data),
          }
        : { defaultData: options.defaultData },
    ),
  }));

  const receiving = initial.controlled && controlled;
  const data = controlled ? options.data : undefined;
  if (receiving) {
    // 描画の中では知らせない（ほかのコンポーネントの更新を描画の中で起こさないため）
    initial.model.receive(data as D, { silent: true });
  }
  useLayoutEffect(() => {
    if (receiving) {
      // 描画の中で受け取った変化を知らせる（知らせていない変化が無ければ何もしない）
      initial.model.receive(data as D);
    }
  });

  useEffect(() => {
    if (controlled !== initial.controlled) {
      _warn(
        `A model is changing from ${initial.controlled ? 'controlled' : 'uncontrolled'} to ${controlled ? 'controlled' : 'uncontrolled'}. The mode decided at the first render is kept.`,
      );
    }
  }, [controlled, initial.controlled]);

  return initial.model;
}
