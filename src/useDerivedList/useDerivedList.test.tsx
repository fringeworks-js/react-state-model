import { createListModel } from '@fringeworks/state-model';
import { act, renderHook } from '@testing-library/react';
import useModelValue from '../useModelValue';
import useDerivedList from './useDerivedList';

type Item = { id: string; price: number };

function createItems() {
  return createListModel<Item>(
    { kind: 'list', record: { kind: 'record' } },
    {
      defaultData: [
        { id: 'A', price: 300 },
        { id: 'B', price: 100 },
        { id: 'C', price: 200 },
      ],
    },
  );
}

const cheap = (item: Item) => item.price < 250;
const byPrice = (a: Item, b: Item) => a.price - b.price;

describe('useDerivedList', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('条件が変わったら差し替え、結果を描画し直す。派生モデルは同じものを返し続ける', () => {
    const items = createItems();
    const { result, rerender } = renderHook(
      ({ filter, sort }) => {
        const derived = useDerivedList(items, { filter, sort });
        return { derived, ids: useModelValue(derived.ids()) };
      },
      {
        initialProps: {
          filter: undefined as typeof cheap | undefined,
          sort: undefined as typeof byPrice | undefined,
        },
      },
    );
    const derived = result.current.derived;
    expect(result.current.ids).toEqual(['A', 'B', 'C']);

    rerender({ filter: cheap, sort: undefined });
    expect(result.current.ids).toEqual(['B', 'C']);
    rerender({ filter: cheap, sort: byPrice });
    expect(result.current.ids).toEqual(['B', 'C']);
    rerender({ filter: undefined, sort: byPrice });
    expect(result.current.ids).toEqual(['B', 'C', 'A']);
    expect(result.current.derived).toBe(derived);
  });

  it('条件の関数が同じ参照なら差し替えない', () => {
    const items = createItems();
    const { result, rerender } = renderHook(() =>
      useDerivedList(items, { filter: cheap }),
    );
    const setFilter = vi.spyOn(result.current, 'setFilter');
    rerender();
    rerender();
    expect(setFilter).not.toHaveBeenCalled();
  });

  it('上流の変化も描画に反映する', () => {
    const items = createItems();
    const { result } = renderHook(() =>
      useModelValue(useDerivedList(items, { sort: byPrice }).ids()),
    );
    act(() => {
      items.record('A').field('price').set(1);
    });
    expect(result.current).toEqual(['A', 'B', 'C']);
  });

  it('上流が途中で変わったら警告し、最初の上流につないだまま', () => {
    const first = createItems();
    const second = createItems();
    const { result, rerender } = renderHook(
      ({ source }) => useDerivedList(source),
      { initialProps: { source: first } },
    );
    rerender({ source: second });
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(result.current.source).toBe(first);
  });

  it('当て直さないモードでは編集しても並びを保ち、refreshOn の値が変わったら当て直す', () => {
    const items = createItems();
    const { result, rerender } = renderHook(
      ({ editing }) =>
        useModelValue(
          useDerivedList(items, {
            sort: byPrice,
            sortRefresh: 'manual',
            refreshOn: { editing },
          }).ids(),
        ),
      { initialProps: { editing: 'A' } },
    );
    expect(result.current).toEqual(['B', 'C', 'A']);
    act(() => {
      items.record('A').field('price').set(1);
    });
    expect(result.current).toEqual(['B', 'C', 'A']);
    rerender({ editing: 'B' });
    expect(result.current).toEqual(['A', 'B', 'C']);
  });

  it('モードを auto に戻すと当て直す', () => {
    const items = createItems();
    const { result, rerender } = renderHook(
      ({ sortRefresh }) =>
        useModelValue(
          useDerivedList(items, { sort: byPrice, sortRefresh }).ids(),
        ),
      {
        initialProps: {
          sortRefresh: 'manual' as 'manual' | 'auto' | undefined,
        },
      },
    );
    act(() => {
      items.record('A').field('price').set(1);
    });
    expect(result.current).toEqual(['B', 'C', 'A']);
    rerender({ sortRefresh: undefined });
    expect(result.current).toEqual(['A', 'B', 'C']);
  });
});
