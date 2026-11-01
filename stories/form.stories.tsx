import type {
  ListModel,
  ModelStatus,
  RecordDefinition,
  RecordModel,
} from '@fringeworks/state-model';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { memo, useState } from 'react';
import { useModelStatus, useModelValue, useRecordModel } from '../src';
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
  id,
  line,
  status,
  onRemove,
}: {
  id: string;
  line: RecordModel<Line, true>;
  status: OrderStatus;
  onRemove: (id: string) => void;
}) {
  const value = useModelValue(line);
  // 自分の行が変更済みか・触ったかだけを読む
  const dirty = useModelValue(status.dirty(['lines', id]));
  const touched = useModelValue(status.touched(['lines', id]));
  // フォーカスが外れたら、触ったことにする（いつ触ったとするかは UI が決める）
  const touch = (key: keyof Line) => () => status.touch(['lines', id, key]);
  if (value === undefined) {
    return null;
  }
  return (
    <tr>
      <td>
        <TextInput field={line.field('product')} onBlur={touch('product')} />
      </td>
      <td>
        <NumberInput field={line.field('price')} onBlur={touch('price')} />
      </td>
      <td>
        <NumberInput
          field={line.field('quantity')}
          onBlur={touch('quantity')}
        />
      </td>
      <td>{value.price * value.quantity}</td>
      <td>
        <button onClick={() => onRemove(value.lineId)}>削除</button>{' '}
        <span style={{ fontSize: 12, color: dirty ? '#c60' : '#999' }}>
          {dirty ? '変更あり' : '変更なし'}
          {touched ? '・触った' : ''}
        </span>
        <RenderCount />
      </td>
    </tr>
  );
});

/**
 * 明細の一覧。id の並びだけを購読する
 */
type OrderStatus = ModelStatus<RecordModel<Order>>;

function Lines({
  lines,
  status,
}: {
  lines: ListModel<Line>;
  status: OrderStatus;
}) {
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
            id={id}
            line={lines.record(id)}
            status={status}
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
 * フォーム全体の状態。どこかが変更済みか・触ったか
 */
function StatusSummary({ status }: { status: OrderStatus }) {
  const dirty = useModelValue(status.dirty());
  const linesDirty = useModelValue(status.dirty(['lines']));
  const touched = useModelValue(status.touched());
  return (
    <p>
      フォーム: {dirty ? '変更あり' : '変更なし'}（明細:{' '}
      {linesDirty ? '変更あり' : '変更なし'}）・
      {touched ? '触った項目あり' : '未操作'}
      <RenderCount />
    </p>
  );
}

/**
 * 注文と明細のフォーム（非制御。データはモデルの中に持つ）
 */
function OrderForm() {
  const order = useRecordModel(orderDefinition, { defaultData: initialOrder });
  const status = useModelStatus(order);
  const lines = order.list('lines');
  const shipping = order.record('shipping');
  const [nextId, setNextId] = useState(3);
  const [snapshot, setSnapshot] = useState<Order | undefined>(undefined);

  return (
    <div style={box}>
      <div>
        顧客{' '}
        <TextInput
          field={order.field('customer')}
          onBlur={() => status.touch(['customer'])}
        />
      </div>
      <div>
        郵便番号 <TextInput field={shipping.field('zip')} width={90} /> 住所{' '}
        <TextInput field={shipping.field('address')} width={200} />
      </div>
      <Lines lines={lines} status={status} />
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
      </button>{' '}
      <button onClick={() => status.markClean()}>保存したことにする</button>{' '}
      <button onClick={() => status.reset()}>状態をリセット</button>
      <StatusSummary status={status} />
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
