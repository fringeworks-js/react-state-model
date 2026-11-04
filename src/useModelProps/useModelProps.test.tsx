import {
  createModelValidation,
  createRecordModel,
  type RecordDefinition,
} from '@fringeworks/state-model';
import { act, renderHook } from '@testing-library/react';
import useModelProps from './useModelProps';

type Line = { lineId: string; product: string };
type Order = { customer: string; tags: string[]; lines: Line[] };

const definition: RecordDefinition<Order> = {
  kind: 'record',
  fields: {
    customer: { validate: (customer) => (customer ? undefined : '必須です') },
    lines: {
      kind: 'list',
      id: 'lineId',
      record: {
        kind: 'record',
        fields: {
          product: {
            validate: (product) => (product ? undefined : '必須です'),
          },
        },
      },
    },
  },
};

function createOrder() {
  return createRecordModel(definition, {
    defaultData: {
      customer: 'Alice',
      tags: ['a'],
      lines: [{ lineId: 'L-1', product: 'Pen' }],
    },
  });
}

describe('useModelProps', () => {
  it('value と、モデルの set をそのまま onValueChange として返す', () => {
    const order = createOrder();
    const customer = order.field('customer');
    const { result } = renderHook(() => useModelProps(customer));

    expect(result.current).toEqual({
      value: 'Alice',
      onValueChange: customer.set,
      invalid: false,
      required: undefined,
    });

    act(() => {
      result.current.onValueChange('Bob');
    });

    expect(result.current.value).toBe('Bob');
    expect(order.get().customer).toBe('Bob');
  });

  it('配列を値に持つ Field も、そのまま渡せる（複数の値を選ぶ部品）', () => {
    const order = createOrder();
    const { result } = renderHook(() => useModelProps(order.field('tags')));

    act(() => {
      result.current.onValueChange(['a', 'b']);
    });

    expect(result.current.value).toEqual(['a', 'b']);
  });

  it('検証の結果があれば invalid を true にし、直すと false に戻す', () => {
    const order = createOrder();
    const validation = createModelValidation(order);
    const customer = order.field('customer');
    const { result } = renderHook(() =>
      useModelProps(customer, { validation }),
    );

    expect(result.current.invalid).toBe(false);

    act(() => {
      customer.set('');
    });

    expect(result.current.invalid).toBe(true);

    act(() => {
      customer.set('Carol');
    });

    expect(result.current.invalid).toBe(false);
  });

  it('下位のモデルにつないだ検証のモデルでも、パスを合わせて読む', () => {
    const order = createOrder();
    const line = order.list('lines').record('L-1');
    const validation = createModelValidation(order.list('lines'));
    const product = line.field('product');
    const { result } = renderHook(() => useModelProps(product, { validation }));

    act(() => {
      product.set('');
    });

    expect(result.current.invalid).toBe(true);
  });

  it('外から入れた結果（サーバーのエラーなど）も invalid にする', () => {
    const order = createOrder();
    const validation = createModelValidation(order);
    const { result } = renderHook(() =>
      useModelProps(order.field('customer'), { validation }),
    );

    act(() => {
      validation.setIssuesAt(
        'server',
        ['customer'],
        [{ message: '使われています' }],
      );
    });

    expect(result.current.invalid).toBe(true);
  });

  it('hideIssues の間は、結果があっても invalid を false にする', () => {
    const order = createOrder();
    const validation = createModelValidation(order);
    order.field('customer').set('');
    const { result, rerender } = renderHook(
      ({ hideIssues }: { hideIssues: boolean }) =>
        useModelProps(order.field('customer'), { validation, hideIssues }),
      { initialProps: { hideIssues: true } },
    );

    expect(result.current.invalid).toBe(false);

    rerender({ hideIssues: false });

    expect(result.current.invalid).toBe(true);
  });

  it('required はそのまま返す', () => {
    const order = createOrder();
    const { result } = renderHook(() =>
      useModelProps(order.field('customer'), { required: true }),
    );

    expect(result.current.required).toBe(true);
  });

  it('検証のモデルのつなぎ先の外のモデルなら、警告して invalid を false にする', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const order = createOrder();
    const other = createOrder();
    const validation = createModelValidation(order);
    other.field('customer').set('');
    const { result } = renderHook(() =>
      useModelProps(other.field('customer'), { validation }),
    );

    expect(result.current.invalid).toBe(false);
    expect(warn).toHaveBeenCalledOnce();
    warn.mockRestore();
  });
});
