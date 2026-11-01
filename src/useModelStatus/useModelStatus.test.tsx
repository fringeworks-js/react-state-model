import { createRecordModel } from '@fringeworks/state-model';
import { act, renderHook } from '@testing-library/react';
import useModelValue from '../useModelValue';
import useModelStatus from './useModelStatus';

type Profile = { name: string; note: string };

describe('useModelStatus', () => {
  it('状態のモデルを1回だけ作り、変更済み・触ったかの変化で描画し直す', () => {
    const profile = createRecordModel<Profile>(
      { kind: 'record' },
      { defaultData: { name: 'Alice', note: '' } },
    );
    const { result } = renderHook(() => {
      const status = useModelStatus(profile);
      return {
        status,
        dirty: useModelValue(status.dirty()),
        touched: useModelValue(status.touched(['name'])),
      };
    });
    const status = result.current.status;
    expect(result.current.dirty).toBe(false);
    act(() => {
      profile.field('name').set('Bob');
      status.touch(['name']);
    });
    expect(result.current.dirty).toBe(true);
    expect(result.current.touched).toBe(true);
    act(() => {
      status.reset();
    });
    expect(result.current.dirty).toBe(false);
    expect(result.current.touched).toBe(false);
    expect(result.current.status).toBe(status);
  });
});
