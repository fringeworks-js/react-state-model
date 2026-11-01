import {
  createRecordModel,
  type ListModel,
  type RecordDefinition,
  type RecordModel,
} from '@fringeworks/state-model';
import { act, render, renderHook, screen } from '@testing-library/react';
import { memo } from 'react';
import useModelValue from './useModelValue';

type Line = { lineId: string; product: string; price: number };
type Order = { customer: string; lines: Line[] };

const orderDefinition: RecordDefinition<Order> = {
  kind: 'record',
  fields: {
    lines: { kind: 'list', id: 'lineId', record: { kind: 'record' } },
  },
};

function createOrder(): Order {
  return {
    customer: 'Alice',
    lines: [1, 2, 3].map((index) => ({
      lineId: `L-${index}`,
      product: `P${index}`,
      price: index * 100,
    })),
  };
}

const renders = new Map<string, number>();
const count = (name: string) => renders.set(name, (renders.get(name) ?? 0) + 1);
const rendersOf = (name: string) => renders.get(name) ?? 0;

function LineRow({ line }: { line: RecordModel<Line, true> }) {
  const value = useModelValue(line);
  count(`row:${line.path[line.path.length - 1]}`);
  return <li data-testid={`price-${value?.lineId}`}>{value?.price}</li>;
}
const MemoLineRow = memo(LineRow);

function LineList({
  lines,
  memoRows = false,
}: {
  lines: ListModel<Line>;
  memoRows?: boolean;
}) {
  const ids = useModelValue(lines.ids());
  count('list');
  const Row = memoRows ? MemoLineRow : LineRow;
  return (
    <ul>
      {ids.map((id) => (
        <Row key={id} line={lines.record(id)} />
      ))}
    </ul>
  );
}

describe('useModelValue', () => {
  beforeEach(() => {
    renders.clear();
  });

  it('モデルの値を返し、変わったら描画し直す', () => {
    const order = createRecordModel(orderDefinition, {
      defaultData: createOrder(),
    });
    const { result } = renderHook(() => useModelValue(order.field('customer')));
    expect(result.current).toBe('Alice');
    act(() => {
      order.field('customer').set('Bob');
    });
    expect(result.current).toBe('Bob');
  });

  it('渡すモデルが変わったら、新しいモデルを読む', () => {
    const order = createRecordModel(orderDefinition, {
      defaultData: createOrder(),
    });
    const { result, rerender } = renderHook(
      ({ id }) => useModelValue(order.list('lines').record(id)),
      { initialProps: { id: 'L-1' } },
    );
    expect(result.current?.price).toBe(100);
    rerender({ id: 'L-2' });
    expect(result.current?.price).toBe(200);
  });

  it('行の中身を変えると、その行だけが描画し直す', () => {
    const order = createRecordModel(orderDefinition, {
      defaultData: createOrder(),
    });
    render(<LineList lines={order.list('lines')} />);
    act(() => {
      order.list('lines').record('L-2').field('price').set(999);
    });
    expect(screen.getByTestId('price-L-2').textContent).toBe('999');
    expect(rendersOf('list')).toBe(1);
    expect(rendersOf('row:L-1')).toBe(1);
    expect(rendersOf('row:L-2')).toBe(2);
    expect(rendersOf('row:L-3')).toBe(1);
  });

  it('行を足すと一覧は描画し直すが、memo の行は同じモデルなので描画し直さない', () => {
    const order = createRecordModel(orderDefinition, {
      defaultData: createOrder(),
    });
    render(<LineList lines={order.list('lines')} memoRows />);
    act(() => {
      order.list('lines').insert([{ lineId: 'L-4', product: '', price: 0 }]);
    });
    expect(rendersOf('list')).toBe(2);
    expect(rendersOf('row:L-1')).toBe(1);
    expect(rendersOf('row:L-4')).toBe(1);
  });

  it('モデルが undefined なら undefined を返す。後からモデルが渡れば、その値を読む', () => {
    const order = createRecordModel(orderDefinition, {
      defaultData: createOrder(),
    });
    const { result, rerender } = renderHook(
      ({ model }) => useModelValue(model),
      {
        initialProps: {
          model: undefined as
            ReturnType<typeof order.field<'customer'>> | undefined,
        },
      },
    );
    expect(result.current).toBeUndefined();
    rerender({ model: order.field('customer') });
    expect(result.current).toBe('Alice');
  });
});
