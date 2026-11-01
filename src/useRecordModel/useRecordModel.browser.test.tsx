import type { RecordDefinition, RecordModel } from '@fringeworks/state-model';
import { cleanup, render } from '@testing-library/react';
import { useState } from 'react';
import useModelValue from '../useModelValue';
import useRecordModel from './useRecordModel';

/**
 * 制御のときの反映待ちのデータ（X3: 外から受け取ったとき、または次のマクロタスクで捨てる）を、
 * 実際のブラウザーの React の描画のタイミングで確かめる
 */

const actEnvironment = globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean };

type Order = { customer: string; note: string };

const definition: RecordDefinition<Order> = { kind: 'record' };
const initial: Order = { customer: 'Alice', note: '' };

/**
 * useState をデータの持ち主にした制御のモデル
 */
function Owner({
  onModel,
  onState,
}: {
  onModel: (model: RecordModel<Order>) => void;
  onState: (order: Order) => void;
}) {
  const [order, setOrder] = useState(initial);
  const model = useRecordModel(definition, {
    data: order,
    onChangeData: setOrder,
  });
  onModel(model);
  onState(order);
  return (
    <button
      data-testid="edit"
      onClick={async () => {
        model.field('customer').set('Bob');
        // React が描画し直す前に、マイクロタスクを挟んで続けて書く
        await Promise.resolve();
        model.field('note').set('urgent');
      }}
    >
      edit
    </button>
  );
}

const nextTask = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('useRecordModel（ブラウザー）', () => {
  // act で包まず、React が実際に描画するタイミングで確かめる。
  // Testing Library が beforeAll で act の環境を有効にするので、その後で切り替える
  let previousActEnvironment: boolean | undefined;
  beforeAll(() => {
    previousActEnvironment = actEnvironment.IS_REACT_ACT_ENVIRONMENT;
    actEnvironment.IS_REACT_ACT_ENVIRONMENT = false;
  });
  afterAll(() => {
    actEnvironment.IS_REACT_ACT_ENVIRONMENT = previousActEnvironment;
  });
  afterEach(() => {
    cleanup();
  });

  it('イベントハンドラーの中で await を挟んで続けて書いても、前の変更は消えない', async () => {
    let state = initial;
    const { getByTestId } = render(
      <Owner onModel={() => {}} onState={(order) => (state = order)} />,
    );
    getByTestId('edit').click();
    await expect.poll(() => state).toEqual({ customer: 'Bob', note: 'urgent' });
  });

  it('React の描画の外（タイマーの中）で await を挟んで続けて書いても、前の変更は消えない', async () => {
    let model!: RecordModel<Order>;
    let state = initial;
    render(
      <Owner
        onModel={(m) => (model = m)}
        onState={(order) => (state = order)}
      />,
    );
    await nextTask();
    model.field('customer').set('Bob');
    await Promise.resolve();
    model.field('note').set('urgent');
    await expect.poll(() => state).toEqual({ customer: 'Bob', note: 'urgent' });
    expect(model.get()).toEqual({ customer: 'Bob', note: 'urgent' });
  });

  it('データの持ち主が受け入れなかった変更は、次のタスクの書き込みに混ざらない', async () => {
    const changes: Order[] = [];
    let model!: RecordModel<Order>;
    function Rejecting({
      onModel,
    }: {
      onModel: (model: RecordModel<Order>) => void;
    }) {
      // 受け取るだけで、state を変えない
      onModel(
        useRecordModel(definition, {
          data: initial,
          onChangeData: (order) => changes.push(order),
        }),
      );
      return null;
    }
    render(<Rejecting onModel={(m) => (model = m)} />);
    model.field('customer').set('Bob');
    await nextTask();
    model.field('note').set('urgent');
    expect(changes[changes.length - 1]).toEqual({
      customer: 'Alice',
      note: 'urgent',
    });
  });

  it('入力欄に入力しても、入力欄の値が古い値に書き戻されない（日本語入力が壊れない）', async () => {
    function Form() {
      const [order, setOrder] = useState(initial);
      const model = useRecordModel(definition, {
        data: order,
        onChangeData: setOrder,
      });
      const customer = useModelValue(model.field('customer'));
      return (
        <input
          data-testid="customer"
          value={customer}
          onChange={(event) => model.field('customer').set(event.target.value)}
        />
      );
    }
    const { getByTestId } = render(<Form />);
    const input = getByTestId('customer') as HTMLInputElement;

    // 入力欄の value への代入（React による書き戻し）を記録する
    const descriptor = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      'value',
    )!;
    const writes: string[] = [];
    Object.defineProperty(input, 'value', {
      configurable: true,
      get() {
        return descriptor.get!.call(this);
      },
      set(value: string) {
        writes.push(value);
        descriptor.set!.call(this, value);
      },
    });
    // ブラウザーが入力欄に文字を入れたのと同じく、代入を記録せずに値を変えて input を送る
    descriptor.set!.call(input, 'Aliceあ');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await nextTask();

    expect(descriptor.get!.call(input)).toBe('Aliceあ');
    expect(writes).not.toContain('Alice');
  });
});
