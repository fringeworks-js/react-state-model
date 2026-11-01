import {
  createDerivedList,
  createRecordModel,
  type FieldModel,
  type RecordDefinition,
} from '@fringeworks/state-model';
import { act, renderHook } from '@testing-library/react';
import useModelValueState from './useModelValueState';

type Line = { lineId: string; price: number };
type Order = { customer: string; lines: Line[] };

const definition: RecordDefinition<Order> = {
  kind: 'record',
  fields: { lines: { kind: 'list', id: 'lineId', record: { kind: 'record' } } },
};

function createOrder() {
  return createRecordModel(definition, {
    defaultData: { customer: 'Alice', lines: [{ lineId: 'L-1', price: 100 }] },
  });
}

describe('useModelValueState', () => {
  it('値とセッターを返す。セッターで書くと、値が変わって描画し直す', () => {
    const order = createOrder();
    const { result } = renderHook(() =>
      useModelValueState(order.field('customer')),
    );
    const [customer, setCustomer] = result.current;
    expect(customer).toBe('Alice');
    act(() => {
      setCustomer('Bob');
    });
    expect(result.current[0]).toBe('Bob');
    // セッターの参照は安定している
    expect(result.current[1]).toBe(setCustomer);
  });

  it('前の値を受け取る関数も渡せる。値の型はモデルの型のまま', () => {
    const order = createOrder();
    const { result } = renderHook(() =>
      useModelValueState(order.list('lines').record('L-1').field('price')),
    );
    const price: number | undefined = result.current[0];
    expect(price).toBe(100);
    act(() => {
      result.current[1]((prev) => (prev ?? 0) + 1);
    });
    expect(result.current[0]).toBe(101);
  });

  it('モデルが undefined なら、値は undefined で、セッターは何もしない', () => {
    const { result } = renderHook(() =>
      useModelValueState<FieldModel<string>>(undefined),
    );
    expect(result.current[0]).toBeUndefined();
    expect(() => result.current[1]('x' as never)).not.toThrow();
  });

  it('書けないモデル（派生モデル）は受け付けない', () => {
    const order = createOrder();
    const derived = createDerivedList(order.list('lines'));
    renderHook(() =>
      // @ts-expect-error 派生モデルは set を持たない
      useModelValueState(derived),
    );
  });
});
