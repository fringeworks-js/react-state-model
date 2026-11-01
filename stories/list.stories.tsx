import type {
  ListGroup,
  ListModel,
  ListSelection,
  RecordModel,
} from '@fringeworks/state-model';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { memo, useState } from 'react';
import {
  useDerivedList,
  useGroupedList,
  useIsSelected,
  useListModel,
  useListSelection,
  useModelValue,
} from '../src';
import { box, NumberInput, RenderCount, TextInput } from './_shared';

type Product = { id: string; name: string; category: string; price: number };

const products: Product[] = [
  { id: 'P-1', name: 'Pen', category: 'Stationery', price: 120 },
  { id: 'P-2', name: 'Notebook', category: 'Stationery', price: 300 },
  { id: 'P-3', name: 'Mug', category: 'Kitchen', price: 800 },
  { id: 'P-4', name: 'Kettle', category: 'Kitchen', price: 3200 },
  { id: 'P-5', name: 'Lamp', category: 'Interior', price: 4500 },
  { id: 'P-6', name: 'Eraser', category: 'Stationery', price: 80 },
];

const sorts = {
  none: undefined,
  priceAsc: (a: Product, b: Product) => a.price - b.price,
  priceDesc: (a: Product, b: Product) => b.price - a.price,
  name: (a: Product, b: Product) => a.name.localeCompare(b.name),
};

const total = (records: readonly Product[]) =>
  records.reduce((sum, product) => sum + product.price, 0);

type ProductGroup = ListGroup<string, Product>;

// 条件の関数はコンポーネントの外に置く（描画のたびに作ると、毎回差し替えになる）
const groupFilters = {
  none: undefined,
  twoOrMore: (group: ProductGroup) => group.records.length >= 2,
  total1000: (group: ProductGroup) => total(group.records) >= 1000,
};

const groupSorts = {
  none: undefined,
  totalDesc: (a: ProductGroup, b: ProductGroup) =>
    total(b.records) - total(a.records),
  countDesc: (a: ProductGroup, b: ProductGroup) =>
    b.records.length - a.records.length,
  name: (a: ProductGroup, b: ProductGroup) => a.key.localeCompare(b.key),
};

/**
 * 行。自分の行のモデルだけを購読する
 */
const ProductRow = memo(function ProductRow({
  product,
  selection,
}: {
  product: RecordModel<Product, true>;
  selection: ListSelection<Product>;
}) {
  const value = useModelValue(product);
  // 自分の行が選ばれているかだけを読む（選択を変えても、ほかの行は描画し直さない）
  const selected = useIsSelected(selection, value?.id ?? '');
  if (value === undefined) {
    return null;
  }
  return (
    <li>
      <input
        type="checkbox"
        aria-label={`${value.name} を選ぶ`}
        checked={selected}
        onChange={() => selection.toggle(value.id)}
      />{' '}
      <TextInput field={product.field('name')} />{' '}
      <TextInput field={product.field('category')} width={90} />{' '}
      <NumberInput field={product.field('price')} />
      <RenderCount />
    </li>
  );
});

/**
 * id の並びだけを購読し、行を並べる
 */
function ProductRows({
  ids,
  list,
  selection,
}: {
  ids: readonly string[];
  list: Pick<ListModel<Product>, 'record'>;
  selection: ListSelection<Product>;
}) {
  return (
    <ul style={{ paddingLeft: 16 }}>
      {ids.map((id) => (
        <ProductRow key={id} product={list.record(id)} selection={selection} />
      ))}
    </ul>
  );
}

/**
 * 一覧を、絞り込み・並べ替え・グループ化して表示する。行の名前と価格は編集できる
 */
function ProductList() {
  const [keyword, setKeyword] = useState('');
  const [sortKey, setSortKey] = useState<keyof typeof sorts>('none');
  const [grouping, setGrouping] = useState(false);
  const [groupFilterKey, setGroupFilterKey] =
    useState<keyof typeof groupFilters>('none');
  const [groupSortKey, setGroupSortKey] =
    useState<keyof typeof groupSorts>('totalDesc');
  const [manual, setManual] = useState(false);

  const items = useListModel<Product>(
    { kind: 'list', record: { kind: 'record' } },
    { defaultData: products },
  );
  // 絞り込みの関数は keyword が変わったときだけ作り直す（描画のたびに作ると毎回差し替えになる）
  const [filter, setFilter] = useState<
    ((product: Product) => boolean) | undefined
  >(undefined);
  // 当て直さないモード: 編集しても行が消えたり動いたりしない（「当て直す」で当て直す）
  const refresh = manual ? 'manual' : 'auto';
  const visible = useDerivedList(items, {
    filter,
    sort: sorts[sortKey],
    filterRefresh: refresh,
    sortRefresh: refresh,
  });
  const grouped = useGroupedList(visible, {
    groupBy: 'category',
    filterGroups: groupFilters[groupFilterKey],
    sortGroups: groupSorts[groupSortKey],
    filterRefresh: refresh,
    sortRefresh: refresh,
  });
  const ids = useModelValue(visible.ids());
  // 選択は List のモデル（データの場所）につなぐ。絞り込みで見えなくなった行の選択も残る
  const selection = useListSelection(items, { multiple: true });
  const selectedRecords = useModelValue(selection.records());
  const groups = useModelValue(grouped);

  return (
    <div style={box}>
      <div>
        <input
          placeholder="名前で絞り込む"
          value={keyword}
          onChange={(event) => {
            const next = event.target.value;
            setKeyword(next);
            setFilter(() =>
              next === ''
                ? undefined
                : (product: Product) =>
                    product.name.toLowerCase().includes(next.toLowerCase()),
            );
          }}
        />{' '}
        <select
          value={sortKey}
          onChange={(event) =>
            setSortKey(event.target.value as keyof typeof sorts)
          }
        >
          <option value="none">並べ替えなし</option>
          <option value="priceAsc">価格の安い順</option>
          <option value="priceDesc">価格の高い順</option>
          <option value="name">名前順</option>
        </select>{' '}
        <label>
          <input
            type="checkbox"
            checked={grouping}
            onChange={(event) => setGrouping(event.target.checked)}
          />
          カテゴリーでグループに分ける
        </label>{' '}
        <label>
          <input
            type="checkbox"
            checked={manual}
            onChange={(event) => setManual(event.target.checked)}
          />
          編集しても当て直さない
        </label>{' '}
        <button
          onClick={() => {
            visible.refresh();
            grouped.refresh();
          }}
        >
          当て直す
        </button>
        <RenderCount />
      </div>
      <div>
        グループの絞り込み{' '}
        <select
          aria-label="グループの絞り込み"
          value={groupFilterKey}
          disabled={!grouping}
          onChange={(event) =>
            setGroupFilterKey(event.target.value as keyof typeof groupFilters)
          }
        >
          <option value="none">絞り込まない</option>
          <option value="twoOrMore">2 件以上のグループ</option>
          <option value="total1000">合計 1000 以上のグループ</option>
        </select>{' '}
        グループの並べ替え{' '}
        <select
          aria-label="グループの並べ替え"
          value={groupSortKey}
          disabled={!grouping}
          onChange={(event) =>
            setGroupSortKey(event.target.value as keyof typeof groupSorts)
          }
        >
          <option value="none">並べ替えない（出現順）</option>
          <option value="totalDesc">合計の大きい順</option>
          <option value="countDesc">件数の多い順</option>
          <option value="name">カテゴリー名の順</option>
        </select>
      </div>
      {grouping ? (
        groups.map((group) => (
          <section key={group.key}>
            <strong>
              {group.key}（{group.records.length} 件・合計{' '}
              {total(group.records)}）
            </strong>
            <ProductRows ids={group.ids} list={grouped} selection={selection} />
          </section>
        ))
      ) : (
        <ProductRows ids={ids} list={visible} selection={selection} />
      )}
      <div>
        選択 {selectedRecords.length} 件・合計 {total(selectedRecords)}{' '}
        <button onClick={() => selection.selectAll()}>全部選ぶ</button>{' '}
        <button onClick={() => selection.clear()}>選択を外す</button>{' '}
        <button onClick={() => items.remove(selection.get())}>
          選んだ行を削除
        </button>
        <RenderCount />
      </div>
      <p style={{ color: '#666', fontSize: 12 }}>
        元の一覧（items.get()）は並べ替えても変わらない:{' '}
        {items.ids().get().join(', ')}
      </p>
    </div>
  );
}

const meta = {
  title: 'state-model/一覧',
  component: ProductList,
} satisfies Meta<typeof ProductList>;

export default meta;

type Story = StoryObj<typeof meta>;

export const FilterSortGroup: Story = {
  name: '絞り込み・並べ替え・グループ化',
};
