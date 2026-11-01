import type {
  FieldModel,
  RecordDefinition,
  RecordId,
  RecordModel,
} from '@fringeworks/state-model';
import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  createModelScope,
  ModelScope,
  useModelAt,
  useModelValue,
  useModelValueState,
  useRecordModel,
} from '../src';
import { box, RenderCount } from './_shared';

type Line = { lineId: string; product: string; price: number };
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
    { lineId: 'L-1', product: 'Pen', price: 120 },
    { lineId: 'L-2', product: 'Notebook', price: 300 },
  ],
};

// ---------------------------------------------------------------------------
// コードで書く部品: 型付きのスコープを使い、メソッドでたどって最後まで型を付ける
// ---------------------------------------------------------------------------

/**
 * 注文のスコープと、明細の行のスコープ（モジュールの最上位で作り、部品から使う）
 */
const OrderScope = createModelScope<RecordModel<Order>>();
const LineScope = createModelScope<RecordModel<Line, true>>();

/**
 * 型の付いた Field のモデルにつないだ入力欄
 */
function TypedInput({
  field,
  width = 160,
}: {
  field: FieldModel<string, boolean> | undefined;
  width?: number;
}) {
  const [value, setValue] = useModelValueState(field);
  return (
    <input
      value={value ?? ''}
      onChange={(event) => setValue(event.target.value)}
      style={{ width }}
    />
  );
}

function TypedNumberInput({
  field,
}: {
  field: FieldModel<number, boolean> | undefined;
}) {
  const [value, setValue] = useModelValueState(field);
  return (
    <input
      type="number"
      value={value ?? 0}
      onChange={(event) => setValue(Number(event.target.value))}
      style={{ width: 80 }}
    />
  );
}

/**
 * 明細の行の中身。行のスコープから、自分の行のモデルを取り出す
 */
function LineFields() {
  const line = LineScope.useModel();
  return (
    <>
      <TypedInput field={line?.field('product')} width={120} />{' '}
      <TypedNumberInput field={line?.field('price')} />
    </>
  );
}

/**
 * 明細の行。行のモデルを行のスコープに置く
 */
function LineRow({ id }: { id: string }) {
  const lines = OrderScope.useModel()?.list('lines');
  if (lines === undefined) {
    return null;
  }
  return (
    <LineScope.Provider model={lines.record(id)}>
      <li>
        <LineFields />
        <RenderCount />
      </li>
    </LineScope.Provider>
  );
}

/**
 * 明細の一覧。注文のスコープから明細の id の並びを読む
 */
function LinesSection() {
  const ids = useModelValue(OrderScope.useModel()?.list('lines').ids());
  return (
    <ul style={{ paddingLeft: 16 }}>
      {(ids ?? []).map((id) => (
        <LineRow key={id} id={id} />
      ))}
    </ul>
  );
}

/**
 * 合計。ページのどこに置いても、注文のスコープから明細を読む
 */
function Total() {
  const lines = useModelValue(OrderScope.useModel()?.list('lines'));
  const total = (lines ?? []).reduce((sum, line) => sum + line.price, 0);
  return (
    <p>
      合計 {total}
      <RenderCount />
    </p>
  );
}

/**
 * 保存するデータを見る
 */
function Snapshot() {
  const order = useModelValue(OrderScope.useModel());
  return <pre style={{ fontSize: 12 }}>{JSON.stringify(order, null, 2)}</pre>;
}

// ---------------------------------------------------------------------------
// 設定から描く部品: どのモデルかは実行時に決まるので、パスで指して kind で絞り込む
// ---------------------------------------------------------------------------

/**
 * 設定から描く入力欄の一覧（パスは、最寄りの ModelScope のモデルからの相対パス）
 */
const headerFields: { label: string; path: readonly RecordId[] }[] = [
  { label: '顧客', path: ['customer'] },
  { label: '郵便番号', path: ['shipping', 'zip'] },
  { label: '住所', path: ['shipping', 'address'] },
];

/**
 * パスだけを受け取る入力欄
 */
function PathInput({ path }: { path: readonly RecordId[] }) {
  const model = useModelAt(path);
  const field = model?.kind === 'field' ? model : undefined;
  const value = useModelValue(field);
  if (field === undefined) {
    return (
      <span style={{ color: 'red' }}>
        （{path.join('.')} は Field ではない）
      </span>
    );
  }
  return (
    <input
      value={String(value ?? '')}
      onChange={(event) => field.set(event.target.value)}
      style={{ width: 160 }}
    />
  );
}

/**
 * 見出しの欄。設定（headerFields）から入力欄を描く
 */
function HeaderSection() {
  return (
    <section>
      {headerFields.map(({ label, path }) => (
        <div key={path.join('.')}>
          {label} <PathInput path={path} />
        </div>
      ))}
    </section>
  );
}

/**
 * ページ。モデルを作ってスコープに置くだけで、子の部品にはモデルを props で渡さない。
 * コードで書く部品のために型付きのスコープ（OrderScope）に、設定から描く部品のために ModelScope に置く
 */
function OrderPage() {
  const order = useRecordModel(orderDefinition, { defaultData: initialOrder });
  return (
    <OrderScope.Provider model={order}>
      <ModelScope model={order}>
        <div style={box}>
          <HeaderSection />
          <LinesSection />
          <Total />
          <Snapshot />
        </div>
      </ModelScope>
    </OrderScope.Provider>
  );
}

const meta = {
  title: 'state-model/スコープ',
  component: OrderPage,
} satisfies Meta<typeof OrderPage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const NestedComponents: Story = {
  name: 'ネストした部品と設定から描く入力欄',
};
