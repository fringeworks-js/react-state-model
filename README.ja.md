# @fringeworks/react-state-model

`@fringeworks/react-state-model` は [`@fringeworks/state-model`](https://github.com/fringeworks-js/state-model) のモデルを React のコンポーネントで使うための、誰かにとっては便利なライブラリです。\
ルートのモデルと派生モデルを作る hook と、モデルの値を読んで描画し直す hook を提供します。モデルそのもの（読み書き・購読・派生モデル）の説明は、state-model の README を見てください。

**[English README is available here](./README.md)**

## インストール

```sh
npm install @fringeworks/state-model @fringeworks/react-state-model
```

## 使い方

### ルートのモデルを作り、値を読む

```tsx
import type { ListModel, RecordModel } from '@fringeworks/state-model';
import { useModelValue, useRecordModel } from '@fringeworks/react-state-model';

function OrderForm() {
  // 非制御: データをモデルの中に持つ
  const order = useRecordModel(orderDefinition, { defaultData: initialOrder });
  return <LineList lines={order.list('lines')} />;
}

function LineList({ lines }: { lines: ListModel<Line> }) {
  const ids = useModelValue(lines.ids()); // id の並びだけを購読する
  return (
    <ul>
      {ids.map((id) => (
        <LineRow key={id} line={lines.record(id)} />
      ))}
    </ul>
  );
}

function LineRow({ line }: { line: RecordModel<Line, true> }) {
  const value = useModelValue(line); // 自分の行だけを購読する
  return <li>{value?.price}</li>;
}
```

行の価格を変えても、一覧のコンポーネントは描画し直さず、変わった行だけが描画し直します。同じ id には同じモデルが返るので、行を `memo` にすれば、行を足したときもほかの行は描画し直しません。

### 値とセッターを組で使う

値を表示し、入力されたら書き込むだけなら、`useModelValueState` で `useState` と同じ形の組を受け取れます。

```tsx
function PriceInput({ price }: { price: FieldModel<number, true> }) {
  const [value, setValue] = useModelValueState(price);
  return (
    <input
      type="number"
      value={value ?? 0}
      onChange={(event) => setValue(Number(event.target.value))}
    />
  );
}
```

セッターはモデルの `set` そのものなので、前の値を受け取る関数も渡せ（`setValue((prev) => prev + 1)`）、参照も安定しています。

### 親の state をデータの持ち主にする（制御）

```tsx
function ProfileForm() {
  const [profile, setProfile] = useState(initialProfile);
  const model = useRecordModel(profileDefinition, {
    data: profile,
    onChangeData: setProfile,
  });
  // ...
}
```

モデルへの書き込みは `onChangeData` で親の state に依頼され、親が描画し直すと、新しい `data` がモデルに渡ります。1つのイベントハンドラーで続けて書いても、`await` を挟んで続けて書いても、前の変更は消えません。

### 絞り込み・並べ替え・グループ化（派生モデル）

```tsx
const byPrice = (a: Product, b: Product) => a.price - b.price;

function ProductList({ keyword }: { keyword: string }) {
  const items = useListModel(productListDefinition, {
    data: products,
    onChangeData: setProducts,
  });
  // 条件の関数は、条件が変わったときだけ作り直す
  const filter = useCallback(
    (product: Product) => product.name.includes(keyword),
    [keyword],
  );
  const visible = useDerivedList(items, { filter, sort: byPrice });
  const grouped = useGroupedList(visible, { groupBy: 'category' });
  const groups = useModelValue(grouped);
  // ...
}
```

### ネストした部品で使う（スコープ）

ソースコードが分かれて何段もネストした画面や、子が動的に描かれる画面（設定から描く画面など）では、モデルを props で渡し続けるのが難しくなります。`ModelScope` でモデルを子孫に配り、部品は最寄りのスコープのモデルを使います。

```tsx
import {
  ModelScope,
  useModelAt,
  useModelValue,
  useRecordModel,
} from '@fringeworks/react-state-model';

function OrderPage() {
  const order = useRecordModel(orderDefinition, { defaultData: initialOrder });
  return (
    <ModelScope model={order} id="order">
      <Lines />
    </ModelScope>
  );
}

function LineRow({ id }: { id: string }) {
  const lines = useModelAt(['lines'], 'order'); // id が "order" のスコープからの相対パス
  // 行のモデルをスコープに置くと、中の部品は行からの相対パスで値を取れる
  return (
    <ModelScope model={(lines as ListModel<Line>).record(id)}>
      <PriceInput />
    </ModelScope>
  );
}

function PriceInput() {
  const price = useModelAt(['price']); // 最寄りのスコープ（行）からの相対パス
  // ...
}
```

- スコープは入れ子にできます。hook は最寄りのスコープのモデルを使い、`id` を渡すとスコープを遡って id が一致するスコープのモデルを使います
- スコープには、ルートのモデル・下位のモデル・派生モデルのどれでも置けます。派生モデルを置くと、行の id から始まるパスで指せます
- パスと id は文字列なので、設定（JSON）から「どのスコープの、どの値か」を指せます
- `useModelAt` と `useScopedModel` はモデルを取り出すだけで、購読しません。値は `useModelValue` で読みます
- Context を通すので、モデルの型は失われます。`useModelAt` の戻り値は `kind` で絞り込み、`useScopedModel` は型引数で型を指定します（`useScopedModel<RecordModel<Order>>()`）
- `useModelValue` は `undefined` も受け付けるので、見つからなかったときの分岐を書かずに値を読めます（`useModelValue(useModelAt(['price']))`）

### 型付きのスコープ

コードで書く部品では、`createModelScope` で型付きのスコープを作ると、取り出したモデルから `list()`・`record()`・`field()` でたどって最後まで型が付きます。パス（`useModelAt`）は、設定から描く部品のように、どのモデルかが実行時に決まる場面に使います。

```tsx
import {
  createModelScope,
  useModelValue,
} from '@fringeworks/react-state-model';

// モジュールの最上位で作り、部品から import して使う
export const OrderScope = createModelScope<RecordModel<Order>>();

function OrderPage() {
  const order = useRecordModel(orderDefinition, { defaultData: initialOrder });
  return (
    <OrderScope.Provider model={order}>
      <Total />
    </OrderScope.Provider>
  );
}

function Total() {
  // lines は readonly Line[] | undefined と型が付く
  const lines = useModelValue(OrderScope.useModel()?.list('lines'));
  // ...
}
```

- スコープごとに別の Context を作るので、`ModelScope` の id では探せません。`useModelAt` の基準にするときは、取り出したモデルを渡します（`useModelAt(path, OrderScope.useModel())`）
- 同じモデルを、型付きのスコープと `ModelScope` の両方に置いてもかまいません

## 知っておくこと

- **作り直さない**: モデルは最初の描画で作り、以後は同じものを返します。定義や派生モデルの上流も、最初の描画のものを使い続けます。変えたいときは、コンポーネントの `key` を変えて作り直してください（派生モデルの上流が変わったときは、開発時に警告します）
- **制御・非制御**: 最初の描画で決まります。途中で `defaultData` と `data` を切り替えると、開発時に警告し、最初の形のまま使います
- **条件の関数は参照で比べる**: 派生モデルの条件（`filter`・`sort`・`groupBy`・`filterGroups`・`sortGroups`）は、参照が変わったときだけ差し替えます。描画のたびに関数を作ると、毎回差し替えて結果を作り直すので、`useCallback` かコンポーネントの外の関数を使ってください
- **編集しても当て直さない**: 入力画面では `filterRefresh`・`sortRefresh` を `'manual'` にすると、編集した行が消えたり動いたりしません（state-model の README の「編集しても当て直さない」）。当て直すきっかけは `refreshOn` に渡します。`refreshOn` の1段目のプロパティのどれかが変わったら、描画の後に `refresh()` を呼びます（例: `refreshOn={{ editingId }}` で、編集する行が変わったときに当て直す）
- **渡すタイミング**: 制御のときの `data` は、データの持ち主が描画し直したその描画の中でモデルが受け取り、購読者には描画の後（`useLayoutEffect`）に知らせます。同じ描画の中で子が新しい値を読むので、入力欄の値が古い値に書き戻されず、日本語入力なども壊れません。派生モデルの条件は描画の後に差し替えます。条件が変わった直後の1回目の描画は前の結果で、画面に表示する前にもう一度描画し直します（古い結果は画面に出ません）
- **`onChangeData`**: 最新の関数を呼びます。描画のたびに新しい関数を渡してもかまいません
- **反映待ちのデータ**: 制御のとき、親がまだ反映していない変更は、新しい `data` を受け取ったとき、または次のマクロタスクで捨てます。親が変更を受け入れなかった場合も、次のタスクの書き込みには混ざりません（Chromium・Firefox・WebKit で確かめています）

## API

| hook                                  | 説明                                                  |
| ------------------------------------- | ----------------------------------------------------- |
| `useListModel(definition, options)`   | List のルートのモデルを作る                           |
| `useRecordModel(definition, options)` | Record のルートのモデルを作る                         |
| `useFieldModel(definition, options)`  | Field のルートのモデルを作る                          |
| `useDerivedList(source, options?)`    | 絞り込み・並べ替えた派生モデルを作る                  |
| `useGroupedList(source, options)`     | グループ化した派生モデルを作る                        |
| `useModelValue(model)`                | モデルの値を読み、変わったら描画し直す                |
| `useModelValueState(model)`           | モデルの値とセッターを、`useState` と同じ形の組で返す |
| `useScopedModel(id?)`                 | スコープのモデルを取り出す                            |
| `useModelAt(path, target?)`           | 基準のモデルからの相対パスで、下位のモデルを取り出す  |
| `createModelScope()`                  | 型付きのスコープ（スコープの部品と hook の組）を作る  |

### `useListModel` / `useRecordModel` / `useFieldModel`

```ts
useListModel<E>(
  definition: ListDefinition<E>,
  options: ListModelOptions<E>,
): ListModel<E> & ModelRoot<readonly E[]>
useRecordModel<T>(
  definition: RecordDefinition<T>,
  options: RecordModelOptions<T>,
): RecordModel<T> & ModelRoot<T>
useFieldModel<V>(
  definition: FieldDefinition,
  options: FieldModelOptions<V>,
): FieldModel<V> & ModelRoot<V>
```

ルートのモデルを作ります。引数とオプションは state-model の `createListModel`・`createRecordModel`・`createFieldModel` と同じです。

| オプション     | 型                  | 説明                                                                 |
| -------------- | ------------------- | -------------------------------------------------------------------- |
| `defaultData`  | `D`                 | 非制御: 初めのデータ。モデルが中に持つ                               |
| `data`         | `D`                 | 制御: データの持ち主のデータ。変わったら描画の後にモデルに渡す       |
| `onChangeData` | `(data: D) => void` | 制御: 書き込みをデータの持ち主に依頼する。新しいデータ全体を受け取る |

### `useDerivedList`

```ts
useDerivedList<E, S extends ListSource<E>>(
  source: S,
  options?: DerivedListOptions<E>,
): DerivedList<E, S>
```

state-model の `createDerivedList` で派生モデルを作ります。オプション（`filter`・`sort`・`filterRefresh`・`sortRefresh`）が変わったら、描画の後に `setFilter` などで差し替えます。

| オプション   | 型                   | 説明                                                                                   |
| ------------ | -------------------- | -------------------------------------------------------------------------------------- |
| `refreshOn?` | `ChangeDependencies` | 当て直すきっかけ。1段目のプロパティのどれかが変わったら、描画の後に `refresh()` を呼ぶ |

ほかのオプションは `createDerivedList` と同じです。

### `useGroupedList`

```ts
useGroupedList<E, K, S extends ListSource<E>>(
  source: S,
  options: GroupedListOptions<E, K>,
): GroupedList<K, E, S>
```

state-model の `createGroupedList` で派生モデルを作ります。オプション（`groupBy`・`filterGroups`・`sortGroups`・`filterRefresh`・`sortRefresh`）が変わったら、描画の後に差し替えます。`refreshOn` は `useDerivedList` と同じです。

### `useModelValue`

```ts
useModelValue<V>(model: ReadonlyModel<V>): V
useModelValue<V>(model: ReadonlyModel<V> | undefined): V | undefined
```

モデルの値を読み、値（参照）が変わったら描画し直します。`ListModel`・`RecordModel`・`FieldModel`、派生モデル、`ids()` の戻り値を渡せます。モデルが `undefined` なら `undefined` を返します（`useModelAt` などでモデルが見つからなかったとき。hook は条件付きで呼べないため）。

### `useModelValueState`

```ts
useModelValueState<M extends WritableModel>(
  model: M,
): [ReturnType<M['get']>, M['set']]
useModelValueState<M extends WritableModel>(
  model: M | undefined,
): [ReturnType<M['get']> | undefined, M['set']]
```

モデルの値とセッターを、`useState` と同じ形の組で返します。値は `useModelValue` と同じく、変わったら描画し直します。セッターはモデルの `set` そのもので、前の値を受け取る関数も渡せ、同じモデルなら同じ関数です。書けるモデル（`FieldModel`・`RecordModel`・`ListModel`）だけを受け付けます（派生モデルと `ids()` の戻り値は `set` を持たないので型エラーになる）。モデルが `undefined` なら、値は `undefined`、セッターは何もしない関数になります。

### `ModelScope`

```tsx
<ModelScope model={model} id="order">
  {children}
</ModelScope>
```

子孫のコンポーネントにモデルを配るスコープです。入れ子にできます。

| プロパティ | 型                       | 説明                                                                            |
| ---------- | ------------------------ | ------------------------------------------------------------------------------- |
| `model`    | `ReadonlyModel<unknown>` | 子孫に配るモデル（ルートのモデル、下位のモデル、派生モデルのどれでもよい）      |
| `id?`      | `string`                 | スコープの id。hook に id を渡すと、id が一致する最寄りのスコープのモデルを使う |

### `useScopedModel`

```ts
useScopedModel<M extends ReadonlyModel<unknown>>(id?: string): M | undefined
```

最寄りのスコープ（`id` を渡せば、id が一致する最寄りのスコープ）のモデルを返します。購読しません。見つからなければ `undefined` を返し、開発時に警告します。型は型引数で指定します。

### `useModelAt`

```ts
useModelAt(
  path: readonly RecordId[],
  target?: ModelTarget,
): UnknownModel | undefined
```

基準のモデルからの相対的なキーと id のパスで、下位のモデルを返します（state-model の `at()`）。購読しません。戻り値のモデルの種類は実行時に決まるので、`kind` で絞り込みます。

| 引数      | 型                    | 説明                                                                                             |
| --------- | --------------------- | ------------------------------------------------------------------------------------------------ |
| `path`    | `readonly RecordId[]` | 基準のモデルからのキーと id のパス                                                               |
| `target?` | `ModelTarget`         | 基準のモデル。未指定なら最寄りのスコープ、文字列なら id が一致するスコープ、モデルならそのモデル |

基準のモデルが見つからないときと、`at()` を持たないモデル（Field のモデル、`ids()` の戻り値）のときは、`undefined` を返し、開発時に警告します。

### `createModelScope`

```ts
createModelScope<M extends ReadonlyModel<unknown>>(): TypedModelScope<M>
```

型付きのスコープを作ります。モジュールの最上位で作り、部品から import して使います。

| メンバー     | 説明                                                                                                         |
| ------------ | ------------------------------------------------------------------------------------------------------------ |
| `Provider`   | 子孫にモデルを配るスコープの部品（プロパティは `model`）。入れ子にした場合、`useModel` は最寄りのものを使う  |
| `useModel()` | 最寄りの `Provider` のモデルを返す hook（購読しない）。見つからなければ `undefined` を返し、開発時に警告する |

### 型

| 型                            | 説明                                                       |
| ----------------------------- | ---------------------------------------------------------- |
| `ModelScopeProps`             | `ModelScope` のプロパティ                                  |
| `ModelTarget`                 | `useModelAt` の基準のモデルの指定（id の文字列か、モデル） |
| `WritableModel`               | 書けるモデル（`useModelValueState` が受け付けるもの）      |
| `TypedModelScope<M>`          | `createModelScope` が作る型付きのスコープ                  |
| `TypedModelScopeProps<M>`     | 型付きのスコープの `Provider` のプロパティ                 |
| `UseDerivedListOptions<E>`    | `useDerivedList` のオプション（`refreshOn` を含む）        |
| `UseGroupedListOptions<E, K>` | `useGroupedList` のオプション（`refreshOn` を含む）        |

## Storybook

使い方の例を Storybook で見られます（一覧の絞り込み・並べ替え・グループ化、注文と明細のフォーム、親の state を使う制御の形）。行ごとに描画の回数を表示しているので、どこが描画し直すかを確かめられます。

```sh
pnpm storybook
```
