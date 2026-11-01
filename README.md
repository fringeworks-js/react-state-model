# @fringeworks/react-state-model

`@fringeworks/react-state-model` is a library some will find handy, for using the models of [`@fringeworks/state-model`](https://github.com/fringeworks-js/state-model) in React components.

**[日本語のREADMEはこちら](./README.ja.md)**

## Installation

```sh
npm install @fringeworks/state-model @fringeworks/react-state-model
```

## Usage

```tsx
import type { ListModel, RecordModel } from '@fringeworks/state-model';
import { useModelValue } from '@fringeworks/react-state-model';

function LineList({ lines }: { lines: ListModel<Line> }) {
  const ids = useModelValue(lines.ids()); // Subscribes only to the order of ids
  return (
    <ul>
      {ids.map((id) => (
        <LineRow key={id} line={lines.record(id)} />
      ))}
    </ul>
  );
}

function LineRow({ line }: { line: RecordModel<Line, true> }) {
  const value = useModelValue(line); // Subscribes only to its own record
  return <li>{value?.price}</li>;
}
```

Changing the price of a record does not render the list component again; only the changed row is rendered again. The same id returns the same model, so if the rows are `memo`, adding a record does not render the other rows again either.

Create a root model outside components, or only once with `useState(() => createRecordModel(...))` and the like. Hooks that create root models will be added later.

## API

### `useModelValue`

```ts
useModelValue<V>(model: ReadonlyModel<V>): V
```

Reads the value of a model and renders again when the value (reference) changes. Accepts a `ListModel`, `RecordModel`, `FieldModel`, or the return value of `ids()`.
