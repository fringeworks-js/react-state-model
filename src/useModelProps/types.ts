import type { ModelValidation } from '@fringeworks/state-model';
import type { WritableModel } from '../useModelValueState';

/**
 * `useModelProps` のオプション
 */
export type UseModelPropsOptions = {
  /**
   * 検証のモデル。渡すと、モデルのパスに結果があるときに `invalid` を `true` にする
   */
  validation?: ModelValidation;

  /**
   * 検証の結果を隠す（`invalid` を `false` にする）。触る前・送信する前などに使う
   */
  hideIssues?: boolean;

  /**
   * 必須であることを示す。そのまま戻り値の `required` にする（表示と支援技術のため。必須の検査は検証の規則に書く）
   */
  required?: boolean;
};

/**
 * `useModelProps` が返す props（値と操作の契約の `value`・`onValueChange`・`invalid`・`required`）
 */
export type ModelProps<M extends WritableModel> = {
  /**
   * モデルの値
   */
  value: ReturnType<M['get']>;

  /**
   * 値を書く（モデルの `set` そのもの）
   */
  onValueChange: M['set'];

  /**
   * 検証の結果があり、隠していないか
   */
  invalid: boolean;

  /**
   * 必須であることを示すか（オプションの `required` のまま）
   */
  required?: boolean;
};
