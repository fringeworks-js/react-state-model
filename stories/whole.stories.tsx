import {
  Checkbox,
  RecordFields,
  Table,
  TextInput,
} from '@fringeworks/react-components';
import '@fringeworks/react-components/styles.css';
import type {
  FieldValueProps,
  RecordField,
  TableColumn,
  TableRenderRowProps,
  TableRowContext,
  TextInputType,
} from '@fringeworks/react-primitives';
import type {
  ListDefinition,
  ListModel,
  ListSelection,
  ModelStatus,
  ModelValidation,
} from '@fringeworks/state-model';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { createContext, useContext, useId, useMemo, useState } from 'react';
import {
  useIsSelected,
  useListModel,
  useListSelection,
  useModelProps,
  useModelStatus,
  useModelValidation,
  useModelValue,
  useRecordModel,
} from '../src';
import { box } from './_shared';

type Member = { id: string; name: string; email: string; active: boolean };

const members: Member[] = [
  { id: 'M-1', name: '山田 太郎', email: 'yamada@example.com', active: true },
  { id: 'M-2', name: '佐藤 花子', email: 'sato@example.com', active: false },
  { id: 'M-3', name: '鈴木 一郎', email: 'suzuki@example.com', active: true },
];

// 項目の定義は、Table の columns と RecordFields の fields のどちらにも渡せる
const memberFields: RecordField<Member>[] = [
  { key: 'id', label: 'ID' },
  {
    key: 'name',
    label: '名前',
    renderValue: (props) => <TextInput {...props} />,
  },
  {
    key: 'email',
    label: 'メール',
    renderValue: (props) => <TextInput {...props} type="email" />,
  },
  {
    key: 'active',
    label: '有効',
    renderValue: (props) => <Checkbox {...props} />,
  },
];

/**
 * 部品が知らせた details を、新しいものから並べる
 */
function useDetailsLog() {
  const [log, setLog] = useState<string[]>([]);
  const add = (details: unknown) =>
    setLog((prev) => [JSON.stringify(details), ...prev].slice(0, 5));
  return [log, add] as const;
}

function DetailsLog({ log }: { log: readonly string[] }) {
  return (
    <div style={{ fontSize: 12, color: '#555' }}>
      details（新しい順）:
      {log.length === 0 ? ' なし' : null}
      {log.map((entry, index) => (
        <div key={index}>{entry}</div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// List → Table
// ---------------------------------------------------------------------------

let nextMemberId = 4;

function MemberTable() {
  const list = useListModel<Member>(
    { kind: 'list', record: { kind: 'record' } },
    { defaultData: members },
  );
  // invalid・required は Table が受け取らないので、value と onValueChange だけを渡す
  const { value, onValueChange } = useModelProps(list);
  const [log, addLog] = useDetailsLog();

  return (
    <div style={{ ...box, display: 'grid', gap: 12, justifyItems: 'start' }}>
      <Table
        aria-label="メンバー"
        value={value}
        onValueChange={(next, details) => {
          onValueChange(next);
          addLog(details);
        }}
        columns={memberFields}
      />

      {/* 部品の外から、同じモデルを操作する */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          type="button"
          onClick={() => {
            const id = `M-${nextMemberId++}`;
            list.insert([{ id, name: '', email: '', active: false }]);
          }}
        >
          行を足す
        </button>
        <button
          type="button"
          onClick={() => {
            const [first] = list.ids().get();
            if (first !== undefined) {
              list.remove([first]);
            }
          }}
        >
          先頭の行を消す
        </button>
        <button
          type="button"
          onClick={() => {
            for (const id of list.ids().get()) {
              list.record(id).field('active').set(true);
            }
          }}
        >
          すべて有効にする
        </button>
        <button type="button" onClick={() => list.set(members)}>
          初めに戻す
        </button>
      </div>

      <DetailsLog log={log} />
      <ModelJson value={value} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Record → RecordFields
// ---------------------------------------------------------------------------

function MemberRecord() {
  const member = useRecordModel<Member>(
    { kind: 'record' },
    { defaultData: members[0]! },
  );
  const { value, onValueChange } = useModelProps(member);
  const [log, addLog] = useDetailsLog();

  return (
    <div style={{ ...box, display: 'grid', gap: 12, justifyItems: 'start' }}>
      <RecordFields
        role="group"
        aria-label="メンバー"
        value={value}
        onValueChange={(next, details) => {
          onValueChange(next);
          addLog(details);
        }}
        fields={memberFields}
      />

      {/* 部品の外から、同じモデルを操作する */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          type="button"
          onClick={() => member.field('name').set((name) => `${name}（様）`)}
        >
          名前に敬称を付ける
        </button>
        <button
          type="button"
          onClick={() => member.field('active').set((active) => !active)}
        >
          有効を切り替える
        </button>
        <button type="button" onClick={() => member.set(members[0]!)}>
          初めに戻す
        </button>
      </div>

      <DetailsLog log={log} />
      <ModelJson value={value} />
    </div>
  );
}

/**
 * モデルの値（部品の外で持っているもの）
 */
function ModelJson({ value }: { value: unknown }) {
  return (
    <pre style={{ margin: 0, fontSize: 12 }}>
      モデルの値: {JSON.stringify(value, null, 2)}
    </pre>
  );
}

// ---------------------------------------------------------------------------
// List → Table と、選んだ行の Record → RecordFields
// ---------------------------------------------------------------------------

// 規則は定義に書く（検証のモデルが使う）
const memberListDefinition: ListDefinition<Member> = {
  kind: 'list',
  record: {
    kind: 'record',
    fields: {
      name: { validate: (name) => (name ? undefined : '必須です') },
      email: {
        validate: (email) =>
          email.includes('@') ? undefined : '@ を含めてください',
      },
    },
  },
};

type MemberList = ListModel<Member>;

/**
 * 部品の外で持つ状態（検証・選択・変更の状態）。Context で配り、セルや行の部品が読む。
 * こうすると、列・項目の定義を部品の外（モジュールの最上位）に置ける
 */
type MemberScope = {
  validation: ModelValidation<MemberList>;
  selection: ListSelection<Member>;
  status: ModelStatus<MemberList>;
};

const MemberScopeContext = createContext<MemberScope | null>(null);

function useMemberScope(): MemberScope {
  const scope = useContext(MemberScopeContext);
  if (!scope) {
    throw new Error('MemberScopeContext の外で使われた');
  }
  return scope;
}

/**
 * 検証の結果を下に出す入力欄。結果は path で読み、aria-describedby で入力欄と結ぶ
 */
function ValidatedTextInput({
  path,
  ...props
}: FieldValueProps<string> & {
  path: readonly string[];
  type?: TextInputType;
  disabled?: boolean;
}) {
  const { validation } = useMemberScope();
  const messageId = useId();
  const issues = useModelValue(validation.issues(path));
  return (
    <div style={{ display: 'grid', gap: 2 }}>
      <TextInput
        {...props}
        invalid={issues.length > 0}
        aria-describedby={issues.length > 0 ? messageId : undefined}
      />
      {issues.length > 0 && (
        <span id={messageId} style={{ color: '#d93025', fontSize: 12 }}>
          {issues.map((issue) => issue.message).join(' ')}
        </span>
      )}
    </div>
  );
}

/**
 * 行を選ぶボタン。選んでいる行は押した状態にする
 */
function SelectButton({ id }: { id: string }) {
  const { selection } = useMemberScope();
  const selected = useIsSelected(selection, id);
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={() => selection.select(id)}
    >
      {selected ? '編集中' : '編集'}
    </button>
  );
}

// 一覧の列。外の状態は Context から読むので、部品の外に置ける。
// Table の path は [行の id, キー] なので、そのまま List の検証のモデルで読める
const listColumns: TableColumn<Member>[] = [
  {
    key: 'id',
    label: 'ID',
    renderValue: ({ value: id }) => (
      <>
        {id} <SelectButton id={id} />
      </>
    ),
  },
  {
    key: 'name',
    label: '名前',
    renderValue: (props, { path }) => (
      <ValidatedTextInput {...props} path={path} />
    ),
  },
  {
    key: 'email',
    label: 'メール（有効な行だけ）',
    // 行のほかの項目（active）に応じて、入力できなくする
    renderValue: (props, { path, record }) => (
      <ValidatedTextInput
        {...props}
        path={path}
        type="email"
        disabled={!record.active}
      />
    ),
  },
  {
    key: 'active',
    label: '有効',
    align: 'center',
    renderValue: (props) => <Checkbox {...props} />,
  },
];

// 横のフォームの項目。RecordFields の path は [キー] なので、行の id（record.id）を前に付ける
const detailFields: RecordField<Member>[] = [
  { key: 'id', label: 'ID' },
  {
    key: 'name',
    label: '名前',
    renderValue: (props, { path, record }) => (
      <ValidatedTextInput {...props} path={[record.id, ...path]} />
    ),
  },
  {
    key: 'email',
    label: 'メール',
    renderValue: (props, { path, record }) => (
      <ValidatedTextInput
        {...props}
        path={[record.id, ...path]}
        type="email"
        disabled={!record.active}
      />
    ),
  },
  {
    key: 'active',
    label: '有効',
    renderValue: (props) => <Checkbox {...props} />,
  },
];

/**
 * 一覧の行。選んでいる行（aria-current と背景）と、変更した行（左の線）を目立たせる。
 * コンポーネントなので hook を使える。行は memo で描くので、選択や変更が変わった行だけが描き直される
 */
function MemberRow({
  path,
  style,
  ...props
}: TableRenderRowProps & { path: readonly [id: string] }) {
  const { selection, status } = useMemberScope();
  const selected = useIsSelected(selection, path[0]);
  const dirty = useModelValue(status.dirty(path));
  return (
    <tr
      {...props}
      aria-current={selected || undefined}
      style={{
        backgroundColor: selected ? '#e8f0fe' : undefined,
        boxShadow: dirty ? 'inset 4px 0 0 #f29900' : undefined,
        ...style,
      }}
    />
  );
}

// 描くたびに新しい関数にならないよう、部品の外に置く（変わると、すべての行を描き直す）
const renderMemberRow = (
  props: TableRenderRowProps,
  { path }: TableRowContext<Member>,
) => <MemberRow {...props} path={path} />;

/**
 * 選んだ行の Record のモデルを、RecordFields で編集する
 */
function MemberDetail({ list, id }: { list: MemberList; id: string }) {
  const { value, onValueChange } = useModelProps(list.record(id));
  if (value === undefined) {
    return <p>選んだ行が一覧にありません</p>;
  }
  return (
    <RecordFields
      role="group"
      aria-label="選んだメンバー"
      value={value}
      onValueChange={(next) => onValueChange(next)}
      fields={detailFields}
    />
  );
}

let nextDetailMemberId = 4;

function MemberMasterDetail() {
  const list = useListModel(memberListDefinition, { defaultData: members });
  const validation = useModelValidation(list);
  const selection = useListSelection(list);
  const status = useModelStatus(list);
  const scope = useMemo(
    () => ({ validation, selection, status }),
    [validation, selection, status],
  );
  const [selectedId] = useModelValue(selection);
  const { value, onValueChange } = useModelProps(list);
  const invalid = useModelValue(validation.invalid());

  return (
    <MemberScopeContext.Provider value={scope}>
      <div style={{ ...box, display: 'grid', gap: 12 }}>
        <div
          style={{
            display: 'flex',
            gap: 24,
            alignItems: 'flex-start',
            flexWrap: 'wrap',
          }}
        >
          <Table
            aria-label="メンバー"
            value={value}
            onValueChange={(next) => onValueChange(next)}
            columns={listColumns}
            renderRow={renderMemberRow}
          />
          <div style={{ minWidth: 240 }}>
            {selectedId === undefined ? (
              <p>一覧の「編集」で行を選んでください</p>
            ) : (
              <MemberDetail list={list} id={selectedId} />
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => {
              const id = `M-${nextDetailMemberId++}`;
              list.insert([{ id, name: '', email: '', active: true }]);
              selection.select(id);
            }}
          >
            行を足して選ぶ
          </button>
          <button
            type="button"
            onClick={() => {
              if (selectedId !== undefined) {
                list.remove([selectedId]);
                selection.clear();
              }
            }}
          >
            選んだ行を消す
          </button>
          <button type="button" onClick={() => status.markClean()}>
            変更を確定する（左の線を消す）
          </button>
          <span style={{ color: invalid ? '#d93025' : '#0a7d4f' }}>
            {invalid ? '入力に問題があります' : '問題はありません'}
          </span>
        </div>

        <ModelJson value={value} />
      </div>
    </MemberScopeContext.Provider>
  );
}

const meta = {
  title: 'contract（一覧・レコードを丸ごと渡す）',
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * List のモデルを部品の外で持ち、行の配列を丸ごと `Table` に渡す。
 * セルの値が確定すると、`Table` が変わった後の配列を作り、`onValueChange` でモデルに書く（details はここでは表示だけに使う）。
 * 部品の外からモデルを変えても（行を足す・消す・項目を変える）、`Table` に反映される
 */
export const List: Story = {
  render: () => <MemberTable />,
};

/**
 * Record のモデルを部品の外で持ち、レコードを丸ごと `RecordFields` に渡す。
 * 項目の値が確定すると、`RecordFields` が変わった後のレコードを作り、`onValueChange` でモデルに書く。
 * 部品の外から項目を変えても、`RecordFields` に反映される。項目の定義は `List` の `Table` の列と同じものを使う
 */
export const Record: Story = {
  render: () => <MemberRecord />,
};

/**
 * List のモデル・選択・検証・変更の状態を部品の外で持ち、一覧（`Table`）で選んだ行を、横の `RecordFields` で編集する。
 * 選んだ行の Record のモデルは `list.record(id)` で、一覧と同じデータを指すので、どちらで編集してももう一方に反映される。
 *
 * - 状態は Context で配るので、列・項目の定義は部品の外に置ける
 * - セルごとの検証の結果は、`renderValue` の2番目の引数の `path` で読む（Table は `[行の id, キー]`、RecordFields は `[キー]` に行の id を前に付ける）
 * - メールは、同じ行の「有効」に応じて入力できなくする（2番目の引数の `record`）
 * - 選んでいる行は背景と `aria-current`、変更した行は左の線で示す（`renderRow` が返す行のコンポーネントの中で hook を使う）。値が変わった行だけを描き直す
 */
export const MasterDetail: Story = {
  render: () => <MemberMasterDetail />,
};
