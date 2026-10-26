import { resolveColor } from '../src/lib/colors.js';
import { ORDER_STATUSES } from '../shared/constants.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import * as v from '../server/utils/validation.js';
import { productData } from '../server/controllers/adminController.js';
test('money and quantity reject nonfinite, negative and fractional inventory input', () => {
  for (const n of [-1, Infinity, NaN, true, null, '']) assert.throws(() => v.amount(n));
  for (const n of [0, -1, 1.5, '2', 51]) assert.throws(() => v.quantity(n));
  assert.equal(v.amount(123.456), 123.46);
  assert.equal(v.quantity(2), 2);
});
test('catalog search escapes regex syntax and bounds pagination', () => {
  assert.equal(v.escapeRegex('a.*(b)'), 'a\\.\\*\\(b\\)');
  assert.deepEqual(v.pageParams({ page: 1.5, limit: 10000 }), { page: 1, limit: 100 });
});
test('product variants must be unique and stock must be a nonnegative integer', () => {
  const data = {
    title: 'Test',
    category: 'Test',
    basePrice: 100,
    variants: [{ color: 'Black', size: 'M', stock: 2 }],
  };
  assert.deepEqual(productData(data).images, []);
  assert.throws(() =>
    productData({ ...data, variants: [...data.variants, { color: 'black', size: 'm', stock: 3 }] }),
  );
  assert.throws(() =>
    productData({ ...data, variants: [{ color: 'Black', size: 'M', stock: -1 }] }),
  );
  assert.throws(() => productData({ ...data, images: ['javascript:alert(1)'] }));
});

test('color names and hex values resolve without guessing misspellings or arbitrary input', () => {
  assert.equal(resolveColor('green').background, 'rgb(0, 128, 0)');
  assert.equal(resolveColor(' BLUE ').background, 'rgb(0, 0, 255)');
  assert.equal(resolveColor('Light Blue').background, 'rgb(173, 216, 230)');
  assert.equal(resolveColor('yellow').foreground, '#111111');
  assert.equal(resolveColor('navy').foreground, '#ffffff');
  assert.equal(resolveColor('#0f0').background, 'rgb(0, 255, 0)');
  for (const input of ['yello', 'constructor', 'var(--x)', 'url(https://example.com)', '', null])
    assert.equal(resolveColor(input), null);
});
test('only the five simplified fulfilment states are selectable', () => {
  assert.deepEqual(ORDER_STATUSES, [
    'pending',
    'processing',
    'out_for_delivery',
    'delivered',
    'cancelled',
  ]);
});
