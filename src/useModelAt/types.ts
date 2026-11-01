import type { ReadonlyModel } from '@fringeworks/state-model';

/**
 * 基準にするモデルの指定
 *
 * - 未指定: 最寄りのスコープ（`ModelScope`）のモデル
 * - 文字列: スコープを遡って、id が一致するスコープのモデル
 * - モデル: そのモデル（プロパティで受け取ったモデルなど）
 */
export type ModelTarget = string | ReadonlyModel<unknown>;
