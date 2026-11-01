import type {
  ListModel,
  RecordDefinition,
  RecordModel,
} from '@fringeworks/state-model';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { memo, useState } from 'react';
import { useModelValue, useRecordModel } from '../src';
import { box, NumberInput, RenderCount, TextInput } from './_shared';

type Line = {
  lineId: string;
  product: string;
  price: number;
  quantity: number;
};
type Order = {
  customer: string;
  shipping: { zip: string; address: string };
  lines: Line[];
};

const orderDefinition: RecordDefinition<Order> = {
  kind: 'record',
  fields: {
    shipping: { kind: 'record' },
    lines: { kind: 'list', id: 'lineId', record: { kind: 'record' } },
  },
};

const initialOrder: Order = {
  customer: 'Alice',
  shipping: { zip: '100-0001', address: 'Tokyo' },
  lines: [
    { lineId: 'L-1', product: 'Pen', price: 120, quantity: 3 },
    { lineId: 'L-2', product: 'Notebook', price: 300, quantity: 1 },
  ],
};

/**
 * 明細の行。自分の行だけを購読する
 */
const LineRow = memo(function LineRow({
  line,
  onRemove,
}: {
  line: RecordModel<Line, true>;
  onRemove: (id: string) => void;
}) {
  const value = useModelValue(line);
  if (value === undefined) {
    return null;
  }
  return (
    <tr>
      <td>
        <TextInput field={line.field('product')} />
      </td>
      <td>
        <NumberInput field={line.field('price')} />
      </td>
      <td>
        <NumberInput field={line.field('quantity')} />
      </td>
      <td>{value.price * value.quantity}</td>
      <td>
        <button onClick={() => onRemove(value.lineId)}>削除</button>
        <RenderCount />
      </td>
    </tr>
  );
});

/**
 * 明細の一覧。id の並びだけを購読する
 */
function Lines({ lines }: { lines: ListModel<Line> }) {
  const ids = useModelValue(lines.ids());
  return (
    <table>
      <thead>
        <tr>
          <th>商品</th>
          <th>単価</th>
          <th>数量</th>
          <th>小計</th>
          <th />
        </tr>
      </thead>
      <tbody>
        {ids.map((id) => (
          <LineRow
            key={id}
            line={lines.record(id)}
            onRemove={(lineId) => lines.remove([lineId])}
          />
        ))}
      </tbody>
    </table>
  );
}

/**
 * 合計。明細全体を購読する
 */
function Total({ lines }: { lines: ListModel<Line> }) {
  const value = useModelValue(lines);
  const total = value.reduce(
    (sum, line) => sum + line.price * line.quantity,
    0,
  );
  return (
    <p>
      合計 {total}
      <RenderCount />
    </p>
  );
}

/**
 * 注文と明細のフォーム（非制御。データはモデルの中に持つ）
 */
function OrderForm() {
  const order = useRecordModel(orderDefinition, { defaultData: initialOrder });
  const lines = order.list('lines');
  const shipping = order.record('shipping');
  const [nextId, setNextId] = useState(3);
  const [snapshot, setSnapshot] = useState<Order | undefined>(undefined);

  return (
    <div style={box}>
      <div>
        顧客 <TextInput field={order.field('customer')} />
      </div>
      <div>
        郵便番号 <TextInput field={shipping.field('zip')} width={90} /> 住所{' '}
        <TextInput field={shipping.field('address')} width={200} />
      </div>
      <Lines lines={lines} />
      <button
        onClick={() => {
          lines.insert([
            { lineId: `L-${nextId}`, product: '', price: 0, quantity: 1 },
          ]);
          setNextId(nextId + 1);
        }}
      >
        明細を足す
      </button>{' '}
      <button onClick={() => setSnapshot(order.get())}>
        保存するデータを見る
      </button>
      <Total lines={lines} />
      {snapshot && (
        <pre style={{ fontSize: 12 }}>{JSON.stringify(snapshot, null, 2)}</pre>
      )}
    </div>
  );
}

const meta = {
  title: 'state-model/注文フォーム',
  component: OrderForm,
} satisfies Meta<typeof OrderForm>;

export default meta;

type Story = StoryObj<typeof meta>;

export const OrderWithLines: Story = { name: '注文と明細' };
