import {
  createDerivedList,
  createRecordModel,
  type RecordDefinition,
  type RecordModel,
} from '@fringeworks/state-model';
import { act, render, renderHook, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import useModelAt from '../useModelAt';
import useModelValue from '../useModelValue';
import useScopedModel from '../useScopedModel';
import ModelScope from './ModelScope';

type Line = { lineId: string; price: number };
type Order = { customer: string; lines: Line[] };

const definition: RecordDefinition<Order> = {
  kind: 'record',
  fields: { lines: { kind: 'list', id: 'lineId', record: { kind: 'record' } } },
};

function createOrder() {
  return createRecordModel(definition, {
    defaultData: {
      customer: 'Alice',
      lines: [
        { lineId: 'L-1', price: 100 },
        { lineId: 'L-2', price: 200 },
      ],
    },
  });
}

describe('ModelScope', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('useScopedModel は最寄りのスコープのモデルを返す。id を渡すと、id が一致するスコープを遡って探す', () => {
    const order = createOrder();
    const line = order.list('lines').record('L-1');
    const wrapper = ({ children }: { children: ReactNode }) => (
      <ModelScope model={order} id="order">
        <ModelScope model={line}>{children}</ModelScope>
      </ModelScope>
    );
    const { result } = renderHook(
      () => ({
        nearest: useScopedModel(),
        byId: useScopedModel<RecordModel<Order>>('order'),
      }),
      { wrapper },
    );
    expect(result.current.nearest).toBe(line);
    expect(result.current.byId).toBe(order);
  });

  it('スコープが見つからなければ undefined を返し、警告する', () => {
    const { result } = renderHook(() => useScopedModel('missing'));
    expect(result.current).toBeUndefined();
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it('useModelAt は、最寄りのスコープのモデルからの相対パスで指す', () => {
    const order = createOrder();
    function PriceInput() {
      // 行の部品の中の深い部品が、自分の行からの相対パスで値を取る
      const price = useModelAt(['price']);
      const value = useModelValue(price!);
      return <span data-testid="price">{String(value)}</span>;
    }
    function Row({ id }: { id: string }) {
      return (
        <ModelScope model={order.list('lines').record(id)}>
          <PriceInput />
        </ModelScope>
      );
    }
    render(
      <ModelScope model={order}>
        <Row id="L-2" />
      </ModelScope>,
    );
    expect(screen.getByTestId('price').textContent).toBe('200');
    act(() => {
      order.at(['lines', 'L-2', 'price']).set(999 as never);
    });
    expect(screen.getByTestId('price').textContent).toBe('999');
  });

  it('useModelAt は、id で指したスコープやモデルそのものを基準にできる', () => {
    const order = createOrder();
    const line = order.list('lines').record('L-1');
    const wrapper = ({ children }: { children: ReactNode }) => (
      <ModelScope model={order} id="order">
        <ModelScope model={line}>{children}</ModelScope>
      </ModelScope>
    );
    const { result } = renderHook(
      () => ({
        byId: useModelAt(['customer'], 'order'),
        byModel: useModelAt(['L-2'], order.list('lines')),
      }),
      { wrapper },
    );
    expect(result.current.byId).toBe(order.field('customer'));
    expect(result.current.byModel).toBe(order.list('lines').record('L-2'));
  });

  it('派生モデルをスコープに置くと、行の id から指せる', () => {
    const order = createOrder();
    const visible = createDerivedList(order.list('lines'), {
      sort: (a, b) => b.price - a.price,
    });
    const { result } = renderHook(() => useModelAt(['L-1', 'price']), {
      wrapper: ({ children }) => (
        <ModelScope model={visible}>{children}</ModelScope>
      ),
    });
    expect(result.current).toBe(order.at(['lines', 'L-1', 'price']));
  });

  it('at() を持たないモデルが基準なら undefined を返し、警告する', () => {
    const order = createOrder();
    const { result } = renderHook(() =>
      useModelAt(['x'], order.field('customer')),
    );
    expect(result.current).toBeUndefined();
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });
});
