import {
  createRecordModel,
  type RecordDefinition,
  type RecordModel,
} from '@fringeworks/state-model';
import { act, render, renderHook, screen } from '@testing-library/react';
import useModelValue from '../useModelValue';
import createModelScope from './createModelScope';

type Line = { lineId: string; price: number };
type Order = { customer: string; lines: Line[] };

const definition: RecordDefinition<Order> = {
  kind: 'record',
  fields: { lines: { kind: 'list', id: 'lineId', record: { kind: 'record' } } },
};

const OrderScope = createModelScope<RecordModel<Order>>();
const LineScope = createModelScope<RecordModel<Line, true>>();

describe('createModelScope', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('型の付いたモデルを配り、子孫が取り出してメソッドでたどれる', () => {
    const order = createRecordModel(definition, {
      defaultData: {
        customer: 'Alice',
        lines: [{ lineId: 'L-1', price: 100 }],
      },
    });
    function Price() {
      // 型が付くので、field('price') の値は number | undefined
      const price: number | undefined = useModelValue(
        LineScope.useModel()?.field('price'),
      );
      return <span data-testid="price">{price}</span>;
    }
    function Lines() {
      const lines = OrderScope.useModel()?.list('lines');
      return (
        <LineScope.Provider model={lines!.record('L-1')}>
          <Price />
        </LineScope.Provider>
      );
    }
    render(
      <OrderScope.Provider model={order}>
        <Lines />
      </OrderScope.Provider>,
    );
    expect(screen.getByTestId('price').textContent).toBe('100');
    act(() => {
      order.list('lines').record('L-1').field('price').set(200);
    });
    expect(screen.getByTestId('price').textContent).toBe('200');
  });

  it('別のスコープは混ざらず、見つからなければ undefined を返して警告する', () => {
    const order = createRecordModel(definition, {
      defaultData: { customer: 'Alice', lines: [] },
    });
    const { result } = renderHook(() => LineScope.useModel(), {
      wrapper: ({ children }) => (
        <OrderScope.Provider model={order}>{children}</OrderScope.Provider>
      ),
    });
    expect(result.current).toBeUndefined();
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });
});
