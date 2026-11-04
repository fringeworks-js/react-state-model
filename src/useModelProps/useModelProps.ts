'use client';

import type { ModelValidation, ReadonlyModel } from '@fringeworks/state-model';
import { useMemo } from 'react';
import _warn from '../_internal/_warn';
import useModelValue from '../useModelValue';
import type { WritableModel } from '../useModelValueState';
import type { ModelProps, UseModelPropsOptions } from './types';

/**
 * 検証のモデルのつなぎ先から見た、モデルのパスを求める。つなぎ先の外のモデルなら undefined
 */
function relativePathOf(
  validation: ModelValidation,
  model: WritableModel & { readonly path: readonly string[] },
): readonly string[] | undefined {
  const source = validation.source as ModelValidation['source'] & {
    readonly path: readonly string[];
    at?: (path: readonly string[]) => unknown;
  };
  const sourcePath = source.path;
  if (
    model.path.length < sourcePath.length ||
    sourcePath.some((segment, index) => model.path[index] !== segment)
  ) {
    return undefined;
  }
  const relative = model.path.slice(sourcePath.length);
  // 同じルートの同じパスなら同じモデルを返すので、たどって同じものになるかで、同じルートのモデルかを確かめる
  const found = relative.length === 0 ? source : source.at?.(relative);
  return found === model ? relative : undefined;
}

/**
 * モデルから、値と操作の契約に沿った部品に渡す props を作る hook
 *
 * `value`・`onValueChange`・`invalid`・`required` を返す。react-primitives・react-components の部品などに、そのまま渡せる。
 * 値は `useModelValue` と同じく、変わったら描画し直す。`onValueChange` はモデルの `set` そのもの（同じモデルなら同じ関数）。
 *
 * - `invalid` は、`validation` を渡したときに、モデルのパス（とその下）に検証の結果があり、`hideIssues` でないときに `true`
 * - 検証のモデルのつなぎ先の外のモデルを渡したときは、開発時に警告し、`invalid` は `false` にする
 * - いつ結果を見せるか（触った後・送信した後など）は画面の側で決め、`hideIssues` で渡す
 *
 * @param model 書けるモデル（`FieldModel`・`RecordModel`・`ListModel`）
 * @param options 検証のモデル・結果を隠すか・必須か
 * @returns 部品に渡す props
 */
export default function useModelProps<M extends WritableModel>(
  model: M,
  { validation, hideIssues = false, required }: UseModelPropsOptions = {},
): ModelProps<M> {
  const value = useModelValue(model) as ReturnType<M['get']>;

  // 結果を読むモデル。同じパスなら同じオブジェクトが返るが、パスを求めるのと警告を毎回しないよう、組ごとに覚える
  const invalidModel = useMemo((): ReadonlyModel<boolean> | undefined => {
    if (validation === undefined) {
      return undefined;
    }
    const path = relativePathOf(
      validation,
      model as M & { readonly path: readonly string[] },
    );
    if (path === undefined) {
      _warn(
        'useModelProps: 検証のモデルのつなぎ先の外のモデルが渡されました。invalid は false になります',
      );
      return undefined;
    }
    return validation.invalid(path);
  }, [validation, model]);

  const hasIssues = useModelValue(invalidModel) ?? false;

  return {
    value,
    onValueChange: model.set,
    invalid: !hideIssues && hasIssues,
    required,
  };
}
