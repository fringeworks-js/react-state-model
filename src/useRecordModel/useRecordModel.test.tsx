import type { RecordDefinition } from '@fringeworks/state-model';
import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
} from '@testing-library/react';
import { useState } from 'react';
import useModelValue from '../useModelValue';
import useRecordModel from './useRecordModel';

type Order = { customer: string; note: string };

const definition: RecordDefinition<Order> = { kind: 'record' };
const initial: Order = { customer: 'Alice', note: '' };

describe('useRecordModel', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    warnSpy.mockRestore();
  });

  describe('非制御', () => {
    it('最初の描画で作ったモデルを返し続ける。定義やデータを変えても作り直さない', () => {
      const { result, rerender } = renderHook(
        ({ data }) => useRecordModel({ kind: 'record' }, { defaultData: data }),
        { initialProps: { data: initial } },
      );
      const model = result.current;
      rerender({ data: { customer: 'Bob', note: '' } });
      expect(result.current).toBe(model);
      expect(model.get()).toBe(initial);
    });

    it('書き込むと、購読しているコンポーネントが描画し直す', () => {
      const { result } = renderHook(() => {
        const model = useRecordModel(definition, { defaultData: initial });
        return { model, customer: useModelValue(model.field('customer')) };
      });
      act(() => {
        result.current.model.field('customer').set('Bob');
      });
      expect(result.current.customer).toBe('Bob');
    });
  });

  describe('制御', () => {
    function Owner({ onModel }: { onModel?: (model: unknown) => void }) {
      const [order, setOrder] = useState(initial);
      const model = useRecordModel(definition, {
        data: order,
        onChangeData: setOrder,
      });
      onModel?.(model);
      const customer = useModelValue(model.field('customer'));
      return (
        <>
          <span data-testid="state">{`${order.customer}/${order.note}`}</span>
          <span data-testid="model">{customer}</span>
          <button
            onClick={() => {
              model.field('customer').set('Bob');
              model.field('note').set('urgent');
            }}
          >
            edit
          </button>
          <button onClick={() => setOrder({ customer: 'Carol', note: '' })}>
            replace
          </button>
        </>
      );
    }

    it('1つのイベントハンドラーで続けて書いても、前の変更は消えない', () => {
      render(<Owner />);
      fireEvent.click(screen.getByText('edit'));
      expect(screen.getByTestId('state').textContent).toBe('Bob/urgent');
      expect(screen.getByTestId('model').textContent).toBe('Bob');
    });

    it('データの持ち主が state を変えると、モデルが受け取って購読者に知らせる', () => {
      render(<Owner />);
      fireEvent.click(screen.getByText('replace'));
      expect(screen.getByTestId('model').textContent).toBe('Carol');
    });

    it('最新の onChangeData を呼ぶ', () => {
      const first = vi.fn();
      const second = vi.fn();
      const { result, rerender } = renderHook(
        ({ onChangeData }) =>
          useRecordModel(definition, { data: initial, onChangeData }),
        { initialProps: { onChangeData: first } },
      );
      rerender({ onChangeData: second });
      act(() => {
        result.current.field('customer').set('Bob');
      });
      expect(first).not.toHaveBeenCalled();
      expect(second).toHaveBeenCalledWith({ customer: 'Bob', note: '' });
    });
  });

  it('制御・非制御が途中で切り替わったら警告し、最初の形のまま使う', () => {
    const { result, rerender } = renderHook(
      ({ controlled }) =>
        useRecordModel(
          definition,
          controlled
            ? { data: initial, onChangeData: () => {} }
            : { defaultData: initial },
        ),
      { initialProps: { controlled: false } },
    );
    rerender({ controlled: true });
    expect(warnSpy).toHaveBeenCalledTimes(1);
    act(() => {
      result.current.field('customer').set('Bob');
    });
    // 非制御のまま、モデルの中のデータが変わる
    expect(result.current.get().customer).toBe('Bob');
  });
});
