import type { RecordDefinition } from '@fringeworks/state-model';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { useModelValue, useRecordModel } from '../src';
import { box, RenderCount, TextInput } from './_shared';

type Profile = { name: string; email: string; note: string };

const definition: RecordDefinition<Profile> = { kind: 'record' };

/**
 * 親の state をデータの持ち主にした、制御のフォーム
 */
function ControlledForm() {
  const [profile, setProfile] = useState<Profile>({
    name: 'Alice',
    email: 'alice@example.com',
    note: '',
  });
  const model = useRecordModel(definition, {
    data: profile,
    onDataChange: setProfile,
  });

  return (
    <div style={box}>
      <div>
        名前 <TextInput field={model.field('name')} />
      </div>
      <div>
        メール <TextInput field={model.field('email')} width={200} />
      </div>
      <div>
        メモ <TextInput field={model.field('note')} width={200} />
      </div>
      <button
        onClick={() => {
          // 1つのイベントハンドラーで続けて書いても、前の変更は消えない
          model.field('name').set('Bob');
          model.field('note').set('名前を Bob にした');
        }}
      >
        モデルから2つの項目を続けて書く
      </button>{' '}
      <button
        onClick={() =>
          setProfile({ name: 'Carol', email: 'carol@example.com', note: '' })
        }
      >
        親の state を直接変える
      </button>{' '}
      <button
        onClick={async () => {
          model.field('name').set('Dave');
          // 通信などを待つ間に描画が入っても、続けて書ける
          await new Promise((resolve) => setTimeout(resolve, 300));
          model.field('note').set('300 ms 後に書いた');
        }}
      >
        await を挟んで続けて書く
      </button>
      <ParentState profile={profile} />
      <NameView model={model} />
    </div>
  );
}

function ParentState({ profile }: { profile: Profile }) {
  return (
    <pre style={{ fontSize: 12 }}>
      親の state: {JSON.stringify(profile, null, 2)}
    </pre>
  );
}

/**
 * 名前だけを購読する部品（ほかの項目を変えても描画し直さないが、親が描画し直すと巻き込まれる）
 */
function NameView({
  model,
}: {
  model: ReturnType<typeof useRecordModel<Profile>>;
}) {
  const name = useModelValue(model.field('name'));
  return (
    <p>
      名前だけを購読: {name}
      <RenderCount />
    </p>
  );
}

const meta = {
  title: 'state-model/制御',
  component: ControlledForm,
} satisfies Meta<typeof ControlledForm>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WithParentState: Story = { name: '親の state を使う' };
