import type {
  FieldModel,
  ListModel,
  ModelStatus,
  ModelValidation,
  RecordDefinition,
  RecordModel,
} from '@fringeworks/state-model';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { memo, useState, type ReactNode } from 'react';
import {
  useFieldModel,
  useModelStatus,
  useModelValidation,
  useModelValue,
  useRecordModel,
} from '../src';
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

// 規則は定義に書く（行の定義の規則は、すべての行に当たる）
const orderDefinition: RecordDefinition<Order> = {
  kind: 'record',
  fields: {
    customer: { validate: (customer) => (customer ? undefined : '必須です') },
    shipping: {
      kind: 'record',
      fields: {
        zip: {
          validate: (zip) =>
            /^\d{3}-\d{4}$/.test(zip) ? undefined : '123-4567 の形で入力',
        },
      },
    },
    lines: {
      kind: 'list',
      id: 'lineId',
      record: {
        kind: 'record',
        fields: {
          product: {
            validate: (product) => (product ? undefined : '必須です'),
          },
          price: { validate: (price) => (price > 0 ? undefined : '1 以上') },
          quantity: {
            validate: (quantity) => (quantity >= 1 ? undefined : '1 以上'),
          },
        },
      },
      validate: (lines) => (lines.length > 0 ? undefined : '明細が要ります'),
    },
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

type OrderStatus = ModelStatus<RecordModel<Order>>;
type OrderValidation = ModelValidation<RecordModel<Order>>;

// ---------------------------------------------------------------------------
// いつ検証の結果を見せるか（③）。ライブラリには無いので、アプリの側で持つ書き方の見本
// ---------------------------------------------------------------------------

/**
 * 触ったパスの集まりと、送信しようとしたかの2つを、Field のモデルに持つ
 */
type Feedback = {
  touchedKeys: FieldModel<readonly string[]>;
  submitted: FieldModel<boolean>;
};

function useFeedback(): Feedback {
  const touchedKeys = useFieldModel<readonly string[]>({}, { defaultData: [] });
  const submitted = useFieldModel<boolean>({}, { defaultData: false });
  return { touchedKeys, submitted };
}

function toKey(path: readonly string[]): string {
  return JSON.stringify(path);
}

/**
 * 触ったことにする（フォーカスが外れたときに呼ぶ）
 */
function touch(feedback: Feedback, path: readonly string[]): void {
  const key = toKey(path);
  feedback.touchedKeys.set((prev) =>
    prev.includes(key) ? prev : [...prev, key],
  );
}

/**
 * 見せる結果。触った後か、送信しようとした後だけ、検証の結果を返す
 */
function useVisibleIssues(
  validation: OrderValidation,
  feedback: Feedback,
  path: readonly string[],
) {
  const issues = useModelValue(validation.issues(path));
  const touched = useModelValue(feedback.touchedKeys).includes(toKey(path));
  const submitted = useModelValue(feedback.submitted);
  return touched || submitted ? issues : [];
}

/**
 * 入力欄と、その下に見せる結果
 */
function Labeled({
  validation,
  feedback,
  path,
  children,
}: {
  validation: OrderValidation;
  feedback: Feedback;
  path: readonly string[];
  children: (onBlur: () => void) => ReactNode;
}) {
  const issues = useVisibleIssues(validation, feedback, path);
  return (
    <span style={{ display: 'inline-block', verticalAlign: 'top' }}>
      {children(() => touch(feedback, path))}
      {issues.map((issue, index) => (
        <div key={index} style={{ color: '#c00', fontSize: 12 }}>
          {issue.message}
        </div>
      ))}
    </span>
  );
}

// ---------------------------------------------------------------------------
// フォーム
// ---------------------------------------------------------------------------

/**
 * 明細の行。自分の行だけを購読する
 */
const LineRow = memo(function LineRow({
  id,
  line,
  status,
  validation,
  feedback,
  onRemove,
}: {
  id: string;
  line: RecordModel<Line, true>;
  status: OrderStatus;
  validation: OrderValidation;
  feedback: Feedback;
  onRemove: (id: string) => void;
}) {
  const value = useModelValue(line);
  // 自分の行が変更済みか・結果があるかだけを読む
  const dirty = useModelValue(status.dirty(['lines', id]));
  const invalid = useModelValue(validation.invalid(['lines', id]));
  if (value === undefined) {
    return null;
  }
  const field = (key: 'product' | 'price' | 'quantity') => ({
    validation,
    feedback,
    path: ['lines', id, key],
  });
  return (
    <tr>
      <td>
        <Labeled {...field('product')}>
          {(onBlur) => (
            <TextInput field={line.field('product')} onBlur={onBlur} />
          )}
        </Labeled>
      </td>
      <td>
        <Labeled {...field('price')}>
          {(onBlur) => (
            <NumberInput field={line.field('price')} onBlur={onBlur} />
          )}
        </Labeled>
      </td>
      <td>
        <Labeled {...field('quantity')}>
          {(onBlur) => (
            <NumberInput field={line.field('quantity')} onBlur={onBlur} />
          )}
        </Labeled>
      </td>
      <td>{value.price * value.quantity}</td>
      <td>
        <button onClick={() => onRemove(value.lineId)}>削除</button>{' '}
        <span style={{ fontSize: 12, color: dirty ? '#c60' : '#999' }}>
          {dirty ? '変更あり' : '変更なし'}
        </span>
        {invalid && (
          <span style={{ fontSize: 12, color: '#c00' }}>・エラーあり</span>
        )}
        <RenderCount />
      </td>
    </tr>
  );
});

/**
 * 明細の一覧。id の並びだけを購読する
 */
function Lines({
  lines,
  status,
  validation,
  feedback,
}: {
  lines: ListModel<Line>;
  status: OrderStatus;
  validation: OrderValidation;
  feedback: Feedback;
}) {
  const ids = useModelValue(lines.ids());
  const issues = useVisibleIssues(validation, feedback, ['lines']);
  return (
    <>
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
              validation={validation}
              feedback={feedback}
              onRemove={(lineId) => lines.remove([lineId])}
            />
          ))}
        </tbody>
      </table>
      {issues.map((issue, index) => (
        <div key={index} style={{ color: '#c00', fontSize: 12 }}>
          {issue.message}
        </div>
      ))}
    </>
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
 * フォーム全体の状態。どこかが変更済みか・結果があるか
 */
function StatusSummary({
  status,
  validation,
}: {
  status: OrderStatus;
  validation: OrderValidation;
}) {
  const dirty = useModelValue(status.dirty());
  const linesDirty = useModelValue(status.dirty(['lines']));
  const invalid = useModelValue(validation.invalid());
  return (
    <p>
      フォーム: {dirty ? '変更あり' : '変更なし'}（明細:{' '}
      {linesDirty ? '変更あり' : '変更なし'}）・
      {invalid ? 'エラーあり（送信できない）' : '送信できる'}
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
  const validation = useModelValidation(order);
  const feedback = useFeedback();
  const lines = order.list('lines');
  const shipping = order.record('shipping');
  const [nextId, setNextId] = useState(3);
  const [snapshot, setSnapshot] = useState<Order | undefined>(undefined);
  const labeled = (path: readonly string[]) => ({
    validation,
    feedback,
    path,
  });

  const submit = () => {
    // 送信しようとしたら、触っていない項目の結果も見せる
    feedback.submitted.set(true);
    if (validation.invalid().get()) {
      return;
    }
    setSnapshot(order.get());
    status.markClean();
  };

  return (
    <div style={box}>
      <div>
        顧客{' '}
        <Labeled {...labeled(['customer'])}>
          {(onBlur) => (
            <TextInput field={order.field('customer')} onBlur={onBlur} />
          )}
        </Labeled>
      </div>
      <div>
        郵便番号{' '}
        <Labeled {...labeled(['shipping', 'zip'])}>
          {(onBlur) => (
            <TextInput
              field={shipping.field('zip')}
              width={90}
              onBlur={onBlur}
            />
          )}
        </Labeled>{' '}
        住所 <TextInput field={shipping.field('address')} width={200} />
      </div>
      <Lines
        lines={lines}
        status={status}
        validation={validation}
        feedback={feedback}
      />
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
      <button onClick={submit}>送信する</button>{' '}
      <button
        onClick={() =>
          // 直したら消えるサーバーのエラー（同じ値に戻すと、また出る）
          validation.setIssues(
            'server',
            [{ path: ['customer'], message: 'この顧客は登録されていません' }],
            { clearOnChange: true },
          )
        }
      >
        サーバーのエラーを入れる
      </button>{' '}
      <button
        onClick={() => {
          feedback.touchedKeys.set([]);
          feedback.submitted.set(false);
          validation.clearIssues();
        }}
      >
        表示をリセット
      </button>
      <StatusSummary status={status} validation={validation} />
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
