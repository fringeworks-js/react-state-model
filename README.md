# @fringeworks/react-state-model

`@fringeworks/react-state-model` is a library some will find handy, for using the models of [`@fringeworks/state-model`](https://github.com/fringeworks-js/state-model) in React components.\
It provides hooks that create root models and derived models, and a hook that reads the value of a model and renders again when it changes. For the models themselves (reading, writing, subscribing, and derived models), see the README of state-model.

**[日本語のREADMEはこちら](./README.ja.md)**

## Installation

```sh
npm install @fringeworks/state-model @fringeworks/react-state-model
```

## Usage

### Creating a root model and reading values

```tsx
import type { ListModel, RecordModel } from '@fringeworks/state-model';
import { useModelValue, useRecordModel } from '@fringeworks/react-state-model';

function OrderForm() {
  // Uncontrolled: the model holds the data itself
  const order = useRecordModel(orderDefinition, { defaultData: initialOrder });
  return <LineList lines={order.list('lines')} />;
}

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

### Using a value and its setter as a pair

When you only display a value and write it when the user changes it, `useModelValueState` returns a pair in the same shape as `useState`.

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

The setter is the model's `set` itself, so it also accepts a function that receives the previous value (`setValue((prev) => prev + 1)`), and its reference is stable.

### Using the parent's state as the data owner (controlled)

```tsx
function ProfileForm() {
  const [profile, setProfile] = useState(initialProfile);
  const model = useRecordModel(profileDefinition, {
    data: profile,
    onDataChange: setProfile,
  });
  // ...
}
```

Writes to the model are passed to the parent's state through `onDataChange`, and when the parent renders again, the new `data` is passed to the model. Consecutive writes do not lose earlier changes, whether they are in one event handler or separated by `await`.

### Filtering, sorting, and grouping (derived models)

```tsx
const byPrice = (a: Product, b: Product) => a.price - b.price;

function ProductList({ keyword }: { keyword: string }) {
  const items = useListModel(productListDefinition, {
    data: products,
    onDataChange: setProducts,
  });
  // Recreate the condition function only when the condition changes
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

### Selecting

```tsx
function ProductList() {
  const items = useListModel(productListDefinition, { defaultData: products });
  const selection = useListSelection(items, { multiple: true });
  // ...
}

const ProductRow = memo(function ProductRow({ id, selection }) {
  // Reads only whether its own record is selected (other rows are not rendered again when the selection changes)
  const selected = useIsSelected(selection, id);
  return (
    <input
      type="checkbox"
      checked={selected}
      onChange={() => selection.toggle(id)}
    />
  );
});
```

To keep the selected ids in the URL or the parent's state, pass a controlled model created with `useFieldModel` to `selectedIds`.

### Validating

Write rules in `validate` of state-model definitions, and create a validation model with `useModelValidation`. Read the issues with `useModelValue`.

```tsx
function OrderForm() {
  const order = useRecordModel(orderDefinition, { defaultData });
  const validation = useModelValidation(order);
  const invalid = useModelValue(validation.invalid()); // Whether the form can be submitted
  // ...
}

function CustomerError({ validation }) {
  const issues = useModelValue(validation.issues(['customer']));
  return issues.map((issue, index) => <p key={index}>{issue.message}</p>);
}
```

The issues are always those of the current data, so they appear as soon as typing starts. **When to show them (after the value is touched, after a submit, and so on) is decided on the screen side**. You can write it by keeping the set of touched paths and whether a submit was attempted.

```tsx
const touchedKeys = useFieldModel<readonly string[]>({}, { defaultData: [] });
const submitted = useFieldModel<boolean>({}, { defaultData: false });

// An input: mark it as touched when focus leaves, and show issues only after it is touched or a submit was attempted
const key = JSON.stringify(['customer']);
const issues = useModelValue(validation.issues(['customer']));
const touched = useModelValue(touchedKeys).includes(key);
const isSubmitted = useModelValue(submitted);
const visible = touched || isSubmitted ? issues : [];
<input
  onBlur={() =>
    touchedKeys.set((prev) => (prev.includes(key) ? prev : [...prev, key]))
  }
/>;
```

When an input component wants to report input that cannot become a value (such as `"1,2,"`), set it with `validation.setIssuesAt('view', path, issues)`, and set an empty array when the problem is gone (also when the component is removed). It appears in `invalid()` together with the issues of the rules.

### Using models in nested components (scopes)

On screens where the source code is split and nested many levels deep, or where children are rendered dynamically (such as screens rendered from settings), passing models down through props becomes hard. `ModelScope` provides a model to descendants, and components use the model of the nearest scope.

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
  const lines = useModelAt(['lines'], 'order'); // A path relative to the scope with the id "order"
  // With the record's model in a scope, components inside read values by paths relative to the record
  return (
    <ModelScope model={(lines as ListModel<Line>).record(id)}>
      <PriceInput />
    </ModelScope>
  );
}

function PriceInput() {
  const price = useModelAt(['price']); // A path relative to the nearest scope (the record)
  // ...
}
```

- Scopes can be nested. Hooks use the model of the nearest scope, and with an `id`, they go up the scopes and use the model of the scope with that id
- Any model can be placed in a scope: a root model, a child model, or a derived model. With a derived model, paths start with a record id
- Paths and ids are strings, so settings (JSON) can point to "which value of which scope"
- `useModelAt` and `useScopedModel` only take out models and do not subscribe. Read values with `useModelValue`
- Types are lost through Context. Narrow the result of `useModelAt` with `kind`, and specify the type of `useScopedModel` with a type argument (`useScopedModel<RecordModel<Order>>()`)
- `useModelValue` also accepts `undefined`, so you can read values without branching on whether a model was found (`useModelValue(useModelAt(['price']))`)

### Typed scopes

In components written in code, create a typed scope with `createModelScope`. Following the taken-out model with `list()`, `record()`, and `field()` keeps types all the way. Use paths (`useModelAt`) where the model is decided at run time, such as components rendered from settings.

```tsx
import {
  createModelScope,
  useModelValue,
} from '@fringeworks/react-state-model';

// Create it at the top level of a module, and import it from components
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
  // lines is typed as readonly Line[] | undefined
  const lines = useModelValue(OrderScope.useModel()?.list('lines'));
  // ...
}
```

- Each typed scope has its own Context, so it cannot be found by the id of `ModelScope`. To use it as the base of `useModelAt`, pass the taken-out model (`useModelAt(path, OrderScope.useModel())`)
- You may place the same model in both a typed scope and a `ModelScope`

## Things to know

- **No re-creation**: a model is created at the first render, and the same one is returned afterwards. The definition and the source of a derived model are also the ones from the first render. To change them, change the component's `key` to create it again (a warning is shown during development when the source of a derived model changes)
- **Controlled and uncontrolled**: decided at the first render. Switching between `defaultData` and `data` later shows a warning during development, and the first mode is kept
- **Condition functions are compared by reference**: the conditions of a derived model (`filter`, `sort`, `groupBy`, `filterGroups`, `sortGroups`) are replaced only when their references change. Creating a function on every render replaces it and rebuilds the result every time, so use `useCallback` or a function outside the component
- **Not reapplying on edits**: on input screens, set `filterRefresh` and `sortRefresh` to `'manual'` so that edited records do not disappear or move (see "Not reapplying on edits" in the README of state-model). Pass the trigger to reapply to `refreshOn`. When any first-level property of `refreshOn` changes, `refresh()` is called after rendering (e.g. `refreshOn={{ editingId }}` reapplies when the record being edited changes)
- **When values are passed**: when controlled, the model takes the new `data` during the render in which the data owner renders again, and notifies subscribers after rendering (`useLayoutEffect`). Children read the new value in the same render, so an input's value is never written back to the old value, and input methods (such as Japanese input) are not broken. The conditions of derived models are replaced after rendering. The first render right after a condition changes shows the previous result, and the component is rendered again before it is painted (the old result never appears on screen)
- **`onDataChange`**: the latest function is called. You may pass a new function on every render
- **Pending data**: when controlled, changes the parent has not applied yet are discarded when new `data` is received, or in the next macrotask. If the parent does not accept a change, it is not mixed into writes in later tasks (verified in Chromium, Firefox, and WebKit)

## API

| Hook                                   | Description                                                                                    |
| -------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `useListModel(definition, options)`    | Creates a root model of the List kind                                                          |
| `useRecordModel(definition, options)`  | Creates a root model of the Record kind                                                        |
| `useFieldModel(definition, options)`   | Creates a root model of the Field kind                                                         |
| `useDerivedList(source, options?)`     | Creates a filtered and sorted derived model                                                    |
| `useGroupedList(source, options)`      | Creates a grouped derived model                                                                |
| `useListSelection(source, options?)`   | Creates a selection model for a list                                                           |
| `useIsSelected(selection, id)`         | Reads whether a record is selected and renders again when it changes                           |
| `useModelStatus(source)`               | Creates a status model (dirty)                                                                 |
| `useModelValidation(source, options?)` | Creates a validation model                                                                     |
| `useModelValue(model)`                 | Reads the value of a model and renders again when it changes                                   |
| `useModelValueState(model)`            | Returns the value of a model and its setter as a pair, in the same shape as `useState`         |
| `useModelProps(model, options?)`       | Creates, from a model, the props for a component that follows the value and operation contract |
| `useScopedModel(id?)`                  | Takes out the model of a scope                                                                 |
| `useModelAt(path, target?)`            | Takes out a child model by a path relative to a base model                                     |
| `createModelScope()`                   | Creates a typed scope (a pair of a scope component and a hook)                                 |

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
  definition: FieldDefinition<V>,
  options: FieldModelOptions<V>,
): FieldModel<V> & ModelRoot<V>
```

Creates a root model. The parameters and options are the same as `createListModel`, `createRecordModel`, and `createFieldModel` of state-model.

| Option         | Type                | Description                                                                            |
| -------------- | ------------------- | -------------------------------------------------------------------------------------- |
| `defaultData`  | `D`                 | Uncontrolled: the initial data, held by the model                                      |
| `data`         | `D`                 | Controlled: the data owner's data. Passed to the model after rendering when it changes |
| `onDataChange` | `(data: D) => void` | Controlled: asks the data owner to apply a write. Receives the whole new data          |

### `useDerivedList`

```ts
useDerivedList<E, S extends ListSource<E>>(
  source: S,
  options?: DerivedListOptions<E>,
): DerivedList<E, S>
```

Creates a derived model with `createDerivedList` of state-model. When the options (`filter`, `sort`, `filterRefresh`, `sortRefresh`) change, they are replaced with `setFilter` and the like after rendering.

| Option       | Type                 | Description                                                                                          |
| ------------ | -------------------- | ---------------------------------------------------------------------------------------------------- |
| `refreshOn?` | `ChangeDependencies` | The trigger to reapply. When any first-level property changes, `refresh()` is called after rendering |

The other options are the same as `createDerivedList`.

### `useGroupedList`

```ts
useGroupedList<E, K, S extends ListSource<E>>(
  source: S,
  options: GroupedListOptions<E, K>,
): GroupedList<K, E, S>
```

Creates a derived model with `createGroupedList` of state-model. When the options (`groupBy`, `filterGroups`, `sortGroups`, `filterRefresh`, `sortRefresh`) change, they are replaced after rendering. `refreshOn` is the same as in `useDerivedList`.

### `useListSelection`

```ts
useListSelection<E, S extends ListSource<E>>(
  source: S,
  options?: ListSelectionOptions,
): ListSelection<E, S>
```

Creates a selection model with `createListSelection` of state-model. It is created at the first render, and the same one is returned afterwards. The source and options from the first render are also kept.

### `useIsSelected`

```ts
useIsSelected(selection: ListSelection | undefined, id: RecordId): boolean
```

Reads whether a record is selected and renders again when it changes. Each row reads a boolean, so when the selection changes, only rows whose selected state changed are rendered again (reading `useModelValue(selection)` in each row renders all rows again). Returns `false` if the selection model is `undefined`.

### `useModelStatus`

```ts
useModelStatus<M extends ModelStatusSource>(source: M): ModelStatus<M>
```

Creates a status model with `createModelStatus` of state-model. It is created at the first render, and the same one is returned afterwards. The baseline is the data at the first render. Read values like `useModelValue(status.dirty(['lines', id]))`.

### `useModelValidation`

```ts
useModelValidation<M extends ModelValidationSource>(
  source: M,
  options?: ModelValidationOptions<V>,
): ModelValidation<M>
```

Creates a validation model with `createModelValidation` of state-model. It is created at the first render, and the same one is returned afterwards. The connected model and the options (`validate`) of the first render are kept (recreate it with `key` to change them). Read the issues like `useModelValue(validation.issues(path))` and `useModelValue(validation.invalid(path))`.

### `useModelValue`

```ts
useModelValue<V>(model: ReadonlyModel<V>): V
useModelValue<V>(model: ReadonlyModel<V> | undefined): V | undefined
```

Reads the value of a model and renders again when the value (reference) changes. Accepts a `ListModel`, `RecordModel`, `FieldModel`, a derived model, or the return value of `ids()`. If the model is `undefined`, it returns `undefined` (when `useModelAt` and the like do not find a model; hooks cannot be called conditionally).

### `useModelValueState`

```ts
useModelValueState<M extends WritableModel>(
  model: M,
): [ReturnType<M['get']>, M['set']]
useModelValueState<M extends WritableModel>(
  model: M | undefined,
): [ReturnType<M['get']> | undefined, M['set']]
```

Returns the value of a model and its setter as a pair, in the same shape as `useState`. Like `useModelValue`, it renders again when the value changes. The setter is the model's `set` itself, accepts a function that receives the previous value, and is the same function for the same model. Only writable models (`FieldModel`, `RecordModel`, `ListModel`) are accepted (derived models and the return value of `ids()` have no `set`, so they are type errors). If the model is `undefined`, the value is `undefined` and the setter does nothing.

### `useModelProps`

```ts
useModelProps<M extends WritableModel>(
  model: M,
  options?: UseModelPropsOptions,
): ModelProps<M>
```

Creates, from a model, the props for a component that follows the value and operation contract ([`@fringeworks/react-contract`](https://github.com/fringeworks-js/react-contract)). You can pass them as they are to components of [`@fringeworks/react-components`](https://github.com/fringeworks-js/react-components), [`@fringeworks/react-primitives`](https://github.com/fringeworks-js/react-primitives), and so on.

```tsx
const validation = useModelValidation(member);
const nameProps = useModelProps(member.field('name'), {
  validation,
  hideIssues: !touched && !submitted, // hide the results before touching or submitting
  required: true,
});

<TextInput {...nameProps} onBlur={() => setTouched(true)} />;
```

| Option        | Type              | Description                                                                                                  |
| ------------- | ----------------- | ------------------------------------------------------------------------------------------------------------ |
| `validation?` | `ModelValidation` | The validation model. When given, `invalid` is `true` while there are results at (or under) the model's path |
| `hideIssues?` | `boolean`         | Hides the validation results (makes `invalid` `false`). Use it before touching or submitting, for example    |
| `required?`   | `boolean`         | Marks it as required. Returned as `required` as it is                                                        |

| Result          | Type                   | Description                                                  |
| --------------- | ---------------------- | ------------------------------------------------------------ |
| `value`         | The model's value type | The value of the model. Re-renders when it changes           |
| `onValueChange` | The model's `set`      | Writes the value (the same function for the same model)      |
| `invalid`       | `boolean`              | Whether there are validation results and they are not hidden |
| `required`      | `boolean \| undefined` | The `required` option as it is                               |

- It accepts writable models (`FieldModel`, `RecordModel`, `ListModel`). For a component that selects several values (such as `CheckboxGroup`), pass a Field whose value is an array.
- The validation model may be connected to the root model or to a lower model. The path is computed from the model's path and where the validation model is connected. If the model is outside of it, it warns in development and `invalid` is `false`.
- When to show the results (after touching, after submitting, and so on) is decided by the screen and passed as `hideIssues`. For example, keep the keys of the fields that were touched and whether a submit was attempted in state (`useState` or `useFieldModel`), add the key in the component's `onBlur`, and mark it as submitted with the submit button. Set `hideIssues` to `true` for a field only when it has not been touched and no submit has been attempted.
- `required` is for display and assistive technology. Write the required check in rules such as `validate` of the definition.
- `disabled` and `readOnly` are not model states, so pass them to the component directly.
- For a model that may point to nothing (such as a lower model of a list row), `value` may be `undefined`. The contract treats an `undefined` `value` as uncontrolled, so do not render the component while the row is missing.

### `ModelScope`

```tsx
<ModelScope model={model} id="order">
  {children}
</ModelScope>
```

A scope that provides a model to descendant components. Scopes can be nested.

| Property | Type                     | Description                                                                             |
| -------- | ------------------------ | --------------------------------------------------------------------------------------- |
| `model`  | `ReadonlyModel<unknown>` | The model provided to descendants (a root model, a child model, or a derived model)     |
| `id?`    | `string`                 | The id of the scope. When a hook receives an id, it uses the nearest scope with that id |

### `useScopedModel`

```ts
useScopedModel<M extends ReadonlyModel<unknown>>(id?: string): M | undefined
```

Returns the model of the nearest scope (or of the nearest scope with the `id`). It does not subscribe. If no scope is found, it returns `undefined` and warns during development. Specify the type with a type argument.

### `useModelAt`

```ts
useModelAt(
  path: readonly RecordId[],
  target?: ModelTarget,
): UnknownModel | undefined
```

Returns a child model by a path of keys and ids relative to a base model (`at()` of state-model). It does not subscribe. The kind of the returned model is decided at run time, so narrow it with `kind`.

| Parameter | Type                  | Description                                                                                                     |
| --------- | --------------------- | --------------------------------------------------------------------------------------------------------------- |
| `path`    | `readonly RecordId[]` | A path of keys and ids from the base model                                                                      |
| `target?` | `ModelTarget`         | The base model. The nearest scope if omitted, the scope with the id if a string, or the model itself if a model |

When the base model is not found, or it has no `at()` (a Field model or the return value of `ids()`), it returns `undefined` and warns during development.

### `createModelScope`

```ts
createModelScope<M extends ReadonlyModel<unknown>>(): TypedModelScope<M>
```

Creates a typed scope. Create it at the top level of a module, and import it from components.

| Member       | Description                                                                                                                                         |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Provider`   | A scope component that provides a model to descendants (the property is `model`). When nested, `useModel` uses the nearest one                      |
| `useModel()` | A hook that returns the model of the nearest `Provider` (does not subscribe). If none is found, it returns `undefined` and warns during development |

### Types

| Type                          | Description                                                                               |
| ----------------------------- | ----------------------------------------------------------------------------------------- |
| `ModelScopeProps`             | Props of `ModelScope`                                                                     |
| `ModelTarget`                 | How `useModelAt` specifies the base model (an id string or a model)                       |
| `WritableModel`               | A writable model (what `useModelValueState` accepts)                                      |
| `UseModelPropsOptions`        | The options of `useModelProps`                                                            |
| `ModelProps<M>`               | The props `useModelProps` returns                                                         |
| `TypedModelScope<M>`          | A typed scope created by `createModelScope`                                               |
| `TypedModelScopeProps<M>`     | Props of the `Provider` of a typed scope                                                  |
| `UseDerivedListOptions<E>`    | Options of `useDerivedList` (including `refreshOn`)                                       |
| `UseGroupedListOptions<E, K>` | Options of `useGroupedList` (including `refreshOn`)                                       |
| `ChangeDependencies`          | The object of trigger values passed to `refreshOn` (a type of `@fringeworks/react-utils`) |
