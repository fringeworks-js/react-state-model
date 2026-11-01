import type { ReadonlyModel } from '@fringeworks/state-model';
import { createContext } from 'react';

/**
 * スコープが配る値（入れ子のスコープは親をたどれる）
 */
export type ModelScopeValue = {
  readonly model: ReadonlyModel<unknown>;
  readonly id: string | undefined;
  readonly parent: ModelScopeValue | undefined;
};

/**
 * モデルのスコープの Context
 */
const ModelScopeContext = createContext<ModelScopeValue | undefined>(undefined);

export default ModelScopeContext;
