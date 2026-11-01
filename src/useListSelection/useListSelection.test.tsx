import { createListModel, type ListSelection } from '@fringeworks/state-model';
import { act, render, renderHook, screen } from '@testing-library/react';
import { memo } from 'react';
import useIsSelected from '../useIsSelected';
import useModelValue from '../useModelValue';
import useListSelection from './useListSelection';

type Item = { id: string; price: number };

function createItems() {
  return createListModel<Item>(
    { kind: 'list', record: { kind: 'record' } },
    {
      defaultData: [
        { id: 'A', price: 100 },
        { id: 'B', price: 200 },
        { id: 'C', price: 300 },
      ],
    },
  );
}

const renders = new Map<string, number>();
const count = (name: string) => renders.set(name, (renders.get(name) ?? 0) + 1);

describe('useListSelection', () => {
  beforeEach(() => {
    renders.clear();
  });

  it('選択のモデルを1回だけ作り、選択の変化で描画し直す', () => {
    const items = createItems();
    const { result } = renderHook(() => {
      const selection = useListSelection(items, { multiple: true });
      return { selection, ids: useModelValue(selection) };
    });
    const selection = result.current.selection;
    act(() => {
      selection.select('B');
    });
    expect(result.current.ids).toEqual(['B']);
    expect(result.current.selection).toBe(selection);
  });

  it('useIsSelected: 選ばれ方が変わった行だけが描画し直す', () => {
    const items = createItems();
    let selection!: ListSelection<Item>;
    const Row = memo(function Row({ id }: { id: string }) {
      const selected = useIsSelected(selection, id);
      count(id);
      return <li data-testid={id}>{selected ? 'on' : 'off'}</li>;
    });
    function List() {
      selection = useListSelection(items, { multiple: true });
      return (
        <ul>
          {['A', 'B', 'C'].map((id) => (
            <Row key={id} id={id} />
          ))}
        </ul>
      );
    }
    render(<List />);
    act(() => {
      selection.toggle('B');
    });
    expect(screen.getByTestId('B').textContent).toBe('on');
    expect(renders.get('A')).toBe(1);
    expect(renders.get('B')).toBe(2);
    expect(renders.get('C')).toBe(1);
  });

  it('useIsSelected: 選択のモデルが undefined なら false', () => {
    const { result } = renderHook(() => useIsSelected(undefined, 'A'));
    expect(result.current).toBe(false);
  });
});
