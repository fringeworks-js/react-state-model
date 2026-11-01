import { createListModel } from '@fringeworks/state-model';
import { renderHook } from '@testing-library/react';
import useModelValue from '../useModelValue';
import useGroupedList from './useGroupedList';

type Item = { id: string; category: string; price: number };

function createItems() {
  return createListModel<Item>(
    { kind: 'list', record: { kind: 'record' } },
    {
      defaultData: [
        { id: 'A', category: 'x', price: 300 },
        { id: 'B', category: 'y', price: 100 },
        { id: 'C', category: 'x', price: 200 },
      ],
    },
  );
}

const byCount = (
  a: { records: readonly Item[] },
  b: { records: readonly Item[] },
) => b.records.length - a.records.length;

describe('useGroupedList', () => {
  it('条件が変わったら差し替え、結果を描画し直す', () => {
    const items = createItems();
    const { result, rerender } = renderHook(
      ({ sortGroups }) => {
        const grouped = useGroupedList(items, {
          groupBy: 'category',
          sortGroups,
        });
        return useModelValue(grouped).map((group) => group.key);
      },
      { initialProps: { sortGroups: undefined as typeof byCount | undefined } },
    );
    expect(result.current).toEqual(['x', 'y']);
    rerender({
      sortGroups: (a, b) => a.records.length - b.records.length,
    });
    expect(result.current).toEqual(['y', 'x']);
    rerender({ sortGroups: byCount });
    expect(result.current).toEqual(['x', 'y']);
  });

  it('グループの分け方を差し替えられる', () => {
    const items = createItems();
    const cheap = (item: Item) => (item.price < 250 ? 'cheap' : 'expensive');
    const { result, rerender } = renderHook(
      ({ byPrice }) => {
        const grouped = useGroupedList<Item, string>(items, {
          groupBy: byPrice ? cheap : (item) => item.category,
        });
        return useModelValue(grouped).map((group) => group.key);
      },
      { initialProps: { byPrice: false } },
    );
    expect(result.current).toEqual(['x', 'y']);
    rerender({ byPrice: true });
    expect(result.current).toEqual(['expensive', 'cheap']);
  });
});
