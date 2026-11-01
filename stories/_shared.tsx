import type { FieldModel } from '@fringeworks/state-model';
import { useRef } from 'react';
import { useModelValueState } from '../src';

/**
 * 描画の回数を数えて表示する（描画し直した範囲を目で確かめるため）
 */
export function RenderCount() {
  const count = useRef(0);
  // 描画の回数を数えるだけで、描画の結果には使わない
  // eslint-disable-next-line react-hooks/refs
  count.current++;
  return (
    <span style={{ color: '#999', fontSize: 11, marginLeft: 8 }}>
      {/* eslint-disable-next-line react-hooks/refs */}
      描画 {count.current}
    </span>
  );
}

/**
 * Field のモデルにつないだ文字列の入力欄
 */
export function TextInput({
  field,
  width = 120,
  onBlur,
}: {
  field: FieldModel<string, boolean>;
  width?: number;
  onBlur?: () => void;
}) {
  const [value, setValue] = useModelValueState(field);
  return (
    <input
      value={value ?? ''}
      onChange={(event) => setValue(event.target.value)}
      onBlur={onBlur}
      style={{ width }}
    />
  );
}

/**
 * Field のモデルにつないだ数値の入力欄（入力途中の値は扱わない）
 */
export function NumberInput({
  field,
  onBlur,
}: {
  field: FieldModel<number, boolean>;
  onBlur?: () => void;
}) {
  const [value, setValue] = useModelValueState(field);
  return (
    <input
      type="number"
      value={value ?? 0}
      onChange={(event) => setValue(Number(event.target.value))}
      onBlur={onBlur}
      style={{ width: 80 }}
    />
  );
}

export const box = {
  fontFamily: 'sans-serif',
  fontSize: 14,
  lineHeight: 1.8,
} as const;
