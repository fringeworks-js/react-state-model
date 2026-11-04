import {
  CheckboxGroup,
  RadioGroup,
  TextInput,
} from '@fringeworks/react-components';
import '@fringeworks/react-components/styles.css';
import { OptionLabel, OptionLabels } from '@fringeworks/react-primitives';
import type {
  FieldModel,
  ModelValidation,
  RecordDefinition,
  RecordModel,
} from '@fringeworks/state-model';
import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ReactNode } from 'react';
import {
  useFieldModel,
  useModelProps,
  useModelValidation,
  useModelValue,
  useRecordModel,
} from '../src';
import { box } from './_shared';

type Member = {
  name: string;
  plan: string | null;
  interests: string[];
};

const PLANS = [
  { value: 'free', label: '無料' },
  { value: 'standard', label: 'スタンダード' },
  { value: 'premium', label: 'プレミアム' },
];

const INTERESTS = [
  { value: 'news', label: 'お知らせ' },
  { value: 'event', label: 'イベント' },
  { value: 'survey', label: 'アンケート' },
];

// 規則は定義に書く（検証のモデルが使う）
const memberDefinition: RecordDefinition<Member> = {
  kind: 'record',
  fields: {
    name: { validate: (name) => (name ? undefined : '必須です') },
    plan: { validate: (plan) => (plan ? undefined : '選んでください') },
    interests: {
      validate: (interests) =>
        interests.length > 0 ? undefined : '1つ以上選んでください',
    },
  },
};

const initialMember: Member = { name: '', plan: null, interests: [] };

type MemberValidation = ModelValidation<RecordModel<Member>>;

// ---------------------------------------------------------------------------
// いつ検証の結果を見せるか（③）。アプリの側で持つ書き方の見本（form.stories.tsx と同じ考え方）
// ---------------------------------------------------------------------------

type Feedback = {
  touchedKeys: FieldModel<readonly string[]>;
  submitted: FieldModel<boolean>;
};

function useFeedback(): Feedback {
  const touchedKeys = useFieldModel<readonly string[]>({}, { defaultData: [] });
  const submitted = useFieldModel<boolean>({}, { defaultData: false });
  return { touchedKeys, submitted };
}

/**
 * 触った後か送信しようとした後でなければ、結果を隠す
 */
function useHideIssues(feedback: Feedback, key: string): boolean {
  const touched = useModelValue(feedback.touchedKeys).includes(key);
  const submitted = useModelValue(feedback.submitted);
  return !touched && !submitted;
}

function touch(feedback: Feedback, key: string): void {
  feedback.touchedKeys.set((prev) =>
    prev.includes(key) ? prev : [...prev, key],
  );
}

/**
 * 項目名と、その下に見せる結果
 */
function Item({
  label,
  validation,
  path,
  hidden,
  children,
}: {
  label: string;
  validation: MemberValidation;
  path: readonly string[];
  hidden: boolean;
  children: ReactNode;
}) {
  const issues = useModelValue(validation.issues(path));
  return (
    <div style={{ display: 'grid', gap: 4, justifyItems: 'start' }}>
      <span style={{ fontWeight: 'bold' }}>{label}</span>
      {children}
      {!hidden &&
        issues.map((issue, index) => (
          <span key={index} style={{ color: '#d93025', fontSize: 12 }}>
            {issue.message}
          </span>
        ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// フォーム
// ---------------------------------------------------------------------------

function MemberForm() {
  const member = useRecordModel(memberDefinition, {
    defaultData: initialMember,
  });
  const validation = useModelValidation(member);
  const feedback = useFeedback();

  const name = member.field('name');
  const plan = member.field('plan');
  const interests = member.field('interests');

  const hideName = useHideIssues(feedback, 'name');
  const hidePlan = useHideIssues(feedback, 'plan');
  const hideInterests = useHideIssues(feedback, 'interests');

  // モデルから契約の props を作り、部品にそのまま渡す
  const nameProps = useModelProps(name, {
    validation,
    hideIssues: hideName,
    required: true,
  });
  const planProps = useModelProps(plan, {
    validation,
    hideIssues: hidePlan,
    required: true,
  });
  const interestsProps = useModelProps(interests, {
    validation,
    hideIssues: hideInterests,
  });

  const invalid = useModelValue(validation.invalid());
  const value = useModelValue(member);

  return (
    <div style={{ ...box, display: 'grid', gap: 16, maxWidth: 520 }}>
      <Item
        label="名前"
        validation={validation}
        path={['name']}
        hidden={hideName}
      >
        <TextInput
          {...nameProps}
          placeholder="山田 太郎"
          onBlur={() => touch(feedback, 'name')}
        />
      </Item>
      <Item
        label="プラン"
        validation={validation}
        path={['plan']}
        hidden={hidePlan}
      >
        <RadioGroup
          {...planProps}
          options={PLANS}
          direction="x"
          onBlur={() => touch(feedback, 'plan')}
        />
      </Item>
      <Item
        label="受け取る連絡"
        validation={validation}
        path={['interests']}
        hidden={hideInterests}
      >
        <CheckboxGroup
          {...interestsProps}
          options={INTERESTS}
          direction="x"
          onBlur={() => touch(feedback, 'interests')}
        />
      </Item>

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          type="button"
          onClick={() => {
            feedback.submitted.set(true);
          }}
        >
          送信する
        </button>
        <button
          type="button"
          onClick={() => {
            member.set(initialMember);
            feedback.touchedKeys.set([]);
            feedback.submitted.set(false);
          }}
        >
          初めに戻す
        </button>
        <span style={{ color: invalid ? '#d93025' : '#0a7d4f' }}>
          {invalid ? '入力に問題があります' : '送信できます'}
        </span>
      </div>

      {/* 表示の部品にも、入力の部品と同じ value・options を渡せる */}
      <div style={{ color: '#555' }}>
        確認: {value.name || '（名前なし）'}・
        <OptionLabel
          value={value.plan}
          options={PLANS}
          placeholder="（プラン未選択）"
        />
        ・
        <OptionLabels
          value={value.interests}
          options={INTERESTS}
          separator="、"
          placeholder="（連絡なし）"
        />
      </div>
    </div>
  );
}

const meta = {
  title: 'contract（部品とつなぐ）',
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * `useModelProps` で、モデルから値と操作の契約の props（`value`・`onValueChange`・`invalid`・`required`）を作り、
 * react-components の部品にそのまま渡す。
 * 結果は、触った（フォーカスが外れた）後か、送信しようとした後だけ見せる（`hideIssues`）
 */
export const Form: Story = {
  render: () => <MemberForm />,
};
