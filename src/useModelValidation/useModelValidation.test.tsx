import { createRecordModel } from '@fringeworks/state-model';
import { act, renderHook } from '@testing-library/react';
import useModelValue from '../useModelValue';
import useModelValidation from './useModelValidation';

type Profile = { name: string; note: string };

describe('useModelValidation', () => {
  it('検証のモデルを1回だけ作り、結果の変化で描画し直す', () => {
    const profile = createRecordModel<Profile>(
      {
        kind: 'record',
        fields: {
          name: { validate: (name) => (name ? undefined : 'Required') },
        },
      },
      { defaultData: { name: 'Alice', note: '' } },
    );
    const { result } = renderHook(() => {
      const validation = useModelValidation(profile);
      return {
        validation,
        issues: useModelValue(validation.issues(['name'])),
        invalid: useModelValue(validation.invalid()),
      };
    });
    const validation = result.current.validation;
    expect(result.current.issues).toEqual([]);
    act(() => {
      profile.field('name').set('');
    });
    expect(result.current.issues).toEqual([{ message: 'Required' }]);
    expect(result.current.invalid).toBe(true);
    act(() => {
      profile.field('name').set('Bob');
      validation.setIssues('server', [{ path: ['note'], message: 'Server' }]);
    });
    expect(result.current.issues).toEqual([]);
    expect(result.current.invalid).toBe(true);
    expect(result.current.validation).toBe(validation);
  });

  it('オプションの規則を受け取る', () => {
    const profile = createRecordModel<Profile>(
      { kind: 'record' },
      { defaultData: { name: 'Alice', note: '' } },
    );
    const { result } = renderHook(() => {
      const validation = useModelValidation(profile, {
        validate: (data) =>
          data.note ? undefined : [{ path: ['note'], message: 'Empty' }],
      });
      return useModelValue(validation.issues(['note']));
    });
    expect(result.current).toEqual([{ message: 'Empty' }]);
  });
});
