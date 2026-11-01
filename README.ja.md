# @fringeworks/react-state-model

`@fringeworks/react-state-model` は [`@fringeworks/state-model`](https://github.com/fringeworks-js/state-model) のモデルを React のコンポーネントで使うための、誰かにとっては便利なライブラリです。

**[English README is available here](./README.md)**

## インストール

```sh
npm install @fringeworks/state-model @fringeworks/react-state-model
```

## 使い方

```tsx
import type { ListModel, RecordModel } from '@fringeworks/state-model';
import { useModelValue } from '@fringeworks/react-state-model';

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

根のモデルは、コンポーネントの外で作るか、`useState(() => createRecordModel(...))` などで1回だけ作ります。根のモデルを作る hook は今後追加する予定です。

## API

### `useModelValue`

```ts
useModelValue<V>(model: ReadonlyModel<V>): V
```

モデルの値を読み、値（参照）が変わったら描画し直します。`ListModel`・`RecordModel`・`FieldModel` と、`ids()` の戻り値を渡せます。
