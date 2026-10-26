import { cloud, UPLOAD_PRESET } from '../server/services/cloudinary.js';
import Media from '../server/models/Media.js';
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from '../server/models/User.js';
import Product from '../server/models/Product.js';
import Order from '../server/models/Order.js';
import Cart from '../server/models/Cart.js';
import Settings from '../server/models/Settings.js';
import Inquiry from '../server/models/Inquiry.js';
import PasswordResetRequest from '../server/models/PasswordResetRequest.js';
import { getSettings } from '../server/controllers/storeController.js';
import { sessionFor } from '../server/controllers/authController.js';
dotenv.config({ quiet: true });
process.env.VERCEL = '1';
let server,
  base,
  adminToken,
  customerToken,
  customer,
  product,
  limited,
  accountOrder,
  guestOrder,
  trackingToken,
  settingsBefore;
const suffix = randomBytes(6).toString('hex'),
  mail = 'qa-' + suffix + '@example.com',
  password = 'Qa-' + randomBytes(16).toString('hex'),
  createdUsers = [],
  createdProducts = [],
  createdOrders = [];
async function api(path, { token, method = 'GET', body, headers = {} } = {}) {
  const r = await fetch(base + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: r.status, data: await r.json() };
}
const bodyFor = (p, qty = 1) => ({
  customer: { name: 'QA Test Customer', email: mail, mobile: '+200000000000' },
  shippingAddress: {
    street: 'QA fixture - not a real delivery',
    city: 'QA district',
    governorate: 'Cairo',
    notes: 'AUTOMATED TEST - DO NOT FULFIL',
  },
  items: [{ productId: String(p._id), color: 'Black', size: 'M', quantity: qty, price: 0.01 }],
  expectedTotal: p.basePrice * qty + 77,
  idempotencyKey: randomUUID(),
  acceptedTerms: true,
});
before(
  async () => {
    const { default: app } = await import('../server/app.js');
    await mongoose.connect(process.env.MONGODB_URI, { dbName: 'mazhari_qa_' + suffix });
    await Promise.all([User.init(), Order.init(), Cart.init()]);
    server = app.listen(0, '127.0.0.1');
    await new Promise((resolve) => server.once('listening', resolve));
    base = 'http://127.0.0.1:' + server.address().port + '/api';
    const admin = await User.create({
      name: 'QA Admin ' + suffix,
      email: 'qa-admin-' + suffix + '@example.com',
      password,
      mobile: '+200000000000',
      role: 'admin',
    });
    createdUsers.push(admin._id);
    adminToken = sessionFor(admin).token;
    await getSettings();
    settingsBefore = await Settings.findById('store').lean();
    await Settings.updateOne(
      { _id: 'store' },
      { $set: { 'shippingRates.$[r].fee': 77, 'shippingRates.$[r].enabled': true } },
      { arrayFilters: [{ 'r.governorate': 'Cairo' }] },
    );
    for (const [title, stock] of [
      ['QA Product ' + suffix, 8],
      ['QA Limited ' + suffix, 1],
    ]) {
      const p = await Product.create({
        title,
        category: 'QA Fixtures',
        basePrice: 100,
        images: ['/images/product.svg'],
        colors: ['Black'],
        sizes: ['M'],
        variants: [{ color: 'Black', size: 'M', stock }],
      });
      createdProducts.push(p._id);
      if (stock === 8) product = p;
      else limited = p;
    }
  },
  { timeout: 30000 },
);
after(
  async () => {
    try {
      if (createdOrders.length) await Order.deleteMany({ _id: { $in: createdOrders } });
      await Order.deleteMany({ 'customer.email': mail });
      await Cart.deleteMany({ user: { $in: createdUsers } });
      await PasswordResetRequest.deleteMany({ user: { $in: createdUsers } });
      await Inquiry.deleteMany({ email: mail });
      await User.deleteMany({ _id: { $in: createdUsers } });
      await Product.deleteMany({ _id: { $in: createdProducts } });
      const old = settingsBefore?.shippingRates.find((r) => r.governorate === 'Cairo');
      if (old)
        await Settings.updateOne(
          { _id: 'store', shippingRates: { $elemMatch: { governorate: 'Cairo', fee: 77 } } },
          { $set: { 'shippingRates.$.fee': old.fee, 'shippingRates.$.enabled': old.enabled } },
        );
    } finally {
      if (server) await new Promise((resolve) => server.close(resolve));
      try {
        if (
          mongoose.connection.name === 'mazhari_qa_' + suffix &&
          /^mazhari_qa_[a-f0-9]{12}$/.test(mongoose.connection.name)
        ) {
          const collections = await mongoose.connection.db
            .listCollections({}, { nameOnly: true })
            .toArray();
          for (const collection of collections)
            await mongoose.connection.db.dropCollection(collection.name);
        }
      } finally {
        await mongoose.disconnect();
      }
    }
  },
  { timeout: 30000 },
);

test('health pings MongoDB and public settings contain all 27 governorates', async () => {
  let r = await api('/health');
  assert.equal(r.status, 200);
  assert.equal(r.data.database, 'connected');
  r = await api('/settings');
  assert.equal(r.data.settings.shippingRates.length, 27);
});
test('register, duplicate rejection, password verification and profile persistence', async () => {
  let r = await api('/auth/register', {
    method: 'POST',
    body: { name: 'QA Customer', email: mail, mobile: '+200000000000', password, role: 'admin' },
  });
  assert.equal(r.status, 201);
  assert.equal(r.data.user.role, 'customer');
  assert.equal(r.data.user.password, undefined);
  customerToken = r.data.token;
  customer = r.data.user;
  createdUsers.push(customer.id);
  r = await api('/auth/register', {
    method: 'POST',
    body: { name: 'Duplicate', email: mail, mobile: '+200000000000', password },
  });
  assert.equal(r.status, 409);
  r = await api('/auth/login', {
    method: 'POST',
    body: { email: mail, password: 'wrong-password' },
  });
  assert.equal(r.status, 401);
  r = await api('/auth/login', {
    method: 'POST',
    body: { email: ' ' + mail.toUpperCase() + ' ', password },
  });
  assert.equal(r.status, 200);
  r = await api('/users/profile', { token: customerToken });
  assert.equal(r.data.user.email, mail);
  r = await api('/admin/metrics', { token: customerToken });
  assert.equal(r.status, 403);
  r = await api('/users/profile');
  assert.equal(r.status, 401);
});
test('profile edits and addresses are persisted', async () => {
  const r = await api('/users/profile', {
    token: customerToken,
    method: 'PUT',
    body: {
      name: 'QA Updated',
      mobile: '+200000000000',
      addresses: [{ street: 'QA street', city: 'QA city', governorate: 'Cairo' }],
    },
  });
  assert.equal(r.status, 200);
  assert.equal(r.data.user.addresses[0].governorate, 'Cairo');
});
test('guest cart merge is idempotent and cart updates use revisions', async () => {
  const mergeKey = randomUUID();
  const body = {
    mergeKey,
    guestItems: [
      { productId: String(product._id), color: 'Black', size: 'M', quantity: 2, price: 0.01 },
    ],
  };
  let r = await api('/cart/sync', { token: customerToken, method: 'POST', body });
  assert.equal(r.status, 200);
  assert.equal(r.data.cart.items[0].price, 100);
  const revision = r.data.cart.revision;
  r = await api('/cart/sync', { token: customerToken, method: 'POST', body });
  assert.equal(r.data.cart.items[0].quantity, 2);
  r = await api('/cart', {
    token: customerToken,
    method: 'PUT',
    body: { items: body.guestItems, revision: revision - 1 },
  });
  assert.equal(r.status, 409);
});
test('quote uses catalog prices and governorate shipping, invalid variants are refused', async () => {
  let r = await api('/orders/quote', {
    method: 'POST',
    body: { governorate: 'Cairo', items: bodyFor(product, 2).items },
  });
  assert.equal(r.status, 200);
  assert.equal(r.data.quote.total, 277);
  r = await api('/orders/quote', {
    method: 'POST',
    body: {
      governorate: 'Cairo',
      items: [{ productId: String(product._id), color: 'Unknown', size: 'M', quantity: 1 }],
    },
  });
  assert.equal(r.status, 409);
});
test('shipping can be disabled or explicitly free and only admins can configure it', async () => {
  const settings = (await api('/settings')).data.settings;
  const rates = settings.shippingRates;
  assert.equal(
    (
      await api('/admin/settings', {
        token: customerToken,
        method: 'PUT',
        body: { shippingRates: rates },
      })
    ).status,
    403,
  );
  try {
    const disabled = rates.map((r) => (r.governorate === 'Cairo' ? { ...r, enabled: false } : r));
    assert.equal(
      (
        await api('/admin/settings', {
          token: adminToken,
          method: 'PUT',
          body: { shippingRates: disabled },
        })
      ).status,
      200,
    );
    assert.equal(
      (
        await api('/orders/quote', {
          method: 'POST',
          body: { governorate: 'Cairo', items: bodyFor(product).items },
        })
      ).status,
      400,
    );
    const free = rates.map((r) => (r.governorate === 'Cairo' ? { ...r, fee: 0 } : r));
    assert.equal(
      (
        await api('/admin/settings', {
          token: adminToken,
          method: 'PUT',
          body: { shippingRates: free },
        })
      ).status,
      200,
    );
    const quote = await api('/orders/quote', {
      method: 'POST',
      body: { governorate: 'Cairo', items: bodyFor(product).items },
    });
    assert.equal(quote.data.quote.shippingFee, 0);
    assert.equal(quote.data.quote.total, 100);
  } finally {
    await Settings.updateOne(
      { _id: 'store' },
      { $set: { 'shippingRates.$[r].fee': 77, 'shippingRates.$[r].enabled': true } },
      { arrayFilters: [{ 'r.governorate': 'Cairo' }] },
    );
  }
});
test('checkout rejects unset delivery rates, fractional quantity and missing policy acknowledgement', async () => {
  assert.equal(
    (
      await api('/orders/quote', {
        method: 'POST',
        body: { governorate: 'Aswan', items: bodyFor(product).items },
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await api('/orders/quote', {
        method: 'POST',
        body: {
          governorate: 'Cairo',
          items: [{ productId: String(product._id), color: 'Black', size: 'M', quantity: 1.5 }],
        },
      })
    ).status,
    400,
  );
  assert.equal(
    (await api('/orders', { method: 'POST', body: { ...bodyFor(product), acceptedTerms: false } }))
      .status,
    400,
  );
});
test('admin product creation, editing and draft visibility use validated variant data', async () => {
  const body = {
    title: 'QA API product ' + suffix,
    category: 'QA',
    basePrice: 1234.5,
    isActive: false,
    variants: [{ color: 'Rose', size: 'S', stock: 3 }],
  };
  let r = await api('/admin/products', {
    token: adminToken,
    method: 'POST',
    body: { ...body, variants: [...body.variants, ...body.variants] },
  });
  assert.equal(r.status, 400);
  r = await api('/admin/products', { token: adminToken, method: 'POST', body });
  assert.equal(r.status, 201);
  const p = r.data.product;
  createdProducts.push(p._id);
  assert.deepEqual(p.colors, ['Rose']);
  assert.equal((await api('/products/' + p._id)).status, 404);
  r = await api('/admin/products/' + p._id, {
    token: adminToken,
    method: 'PUT',
    body: { ...body, isActive: true, basePrice: 567.8 },
  });
  assert.equal(r.status, 200);
  r = await api('/products/' + p._id);
  assert.equal(r.status, 200);
  assert.equal(r.data.product.basePrice, 567.8);
});

test('admin collection filtering combines search and status and keeps catalog-wide options', async () => {
  let r = await api('/admin/products?category=QA&limit=1', { token: adminToken });
  assert.equal(r.status, 200);
  assert.equal(r.data.total, 1);
  assert.equal(r.data.products.length, 1);
  assert.equal(r.data.products[0].category, 'QA');
  assert.ok(r.data.collections.includes('QA Fixtures'));
  assert.ok(r.data.collections.includes('QA'));
  r = await api('/admin/products?category=QA&search=does-not-exist', { token: adminToken });
  assert.equal(r.data.total, 0);
  assert.ok(r.data.collections.includes('QA'));
  r = await api('/admin/products?category=QA&status=deleted', { token: adminToken });
  assert.equal(r.data.total, 0);
  r = await api('/admin/products?category=QA%20Fixtures&status=active&limit=1&page=2', {
    token: adminToken,
  });
  assert.equal(r.status, 200);
  assert.ok(r.data.total >= 2);
  assert.equal(r.data.products.length, 1);
  assert.equal(r.data.products[0].category, 'QA Fixtures');
  r = await api('/admin/products?category=QA.*', { token: adminToken });
  assert.equal(r.data.total, 0);
});

test('media uploads require admin access, verify Cloudinary assets, and protect assigned images', async () => {
  assert.equal((await api('/admin/media')).status, 401);
  assert.equal((await api('/admin/media', { token: customerToken })).status, 403);
  const envKeys = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'];
  const previous = envKeys.map((key) => process.env[key]);
  process.env.CLOUDINARY_CLOUD_NAME = 'mazhari-test-cloud';
  process.env.CLOUDINARY_API_KEY = 'qa-key';
  process.env.CLOUDINARY_API_SECRET = 'qa-secret-not-a-real-credential';
  const sdk = cloud();
  const original = {
    preset: sdk.api.upload_preset,
    update: sdk.api.update_upload_preset,
    resource: sdk.api.resource,
  };
  let format = 'jpg';
  sdk.api.upload_preset = async () => ({ name: UPLOAD_PRESET });
  sdk.api.update_upload_preset = async (_name, options) => {
    assert.equal(options.unsigned, false);
    assert.equal(options.max_file_size, 20 * 1024 * 1024);
  };
  sdk.api.resource = async (publicId) => ({
    public_id: publicId,
    resource_type: 'image',
    format,
    bytes: 1200,
    width: 800,
    height: 600,
    version: 1234,
  });
  try {
    let r = await api('/admin/media/sign', {
      token: adminToken,
      method: 'POST',
      body: { name: 'bad.svg', size: 100, type: 'image/svg+xml' },
    });
    assert.equal(r.status, 400);
    r = await api('/admin/media/sign', {
      token: adminToken,
      method: 'POST',
      body: { name: 'large.jpg', size: 21 * 1024 * 1024, type: 'image/jpeg' },
    });
    assert.equal(r.status, 400);
    r = await api('/admin/media/sign', {
      token: adminToken,
      method: 'POST',
      body: { name: 'qa.jpg', size: 1200, type: 'image/jpeg', purpose: 'banner', overwrite: true },
    });
    assert.equal(r.status, 200);
    const signed = r.data;
    assert.equal(signed.params.overwrite, false);
    assert.equal(signed.params.upload_preset, UPLOAD_PRESET);
    assert.equal(signed.apiSecret, undefined);
    assert.match(signed.params.public_id, /^mazhari\/banner\//);
    format = 'svg';
    r = await api('/admin/media/' + signed.mediaId + '/complete', {
      token: adminToken,
      method: 'POST',
      body: {},
    });
    assert.equal(r.status, 400);
    format = 'jpg';
    r = await api('/admin/media/' + signed.mediaId + '/complete', {
      token: adminToken,
      method: 'POST',
      body: { url: 'https://attacker.example/fake.jpg' },
    });
    assert.equal(r.status, 201);
    const media = r.data.media;
    assert.match(media.url, /^https:\/\/res\.cloudinary\.com\/mazhari-test-cloud\/image\/upload\//);
    r = await api('/admin/media/' + signed.mediaId + '/complete', {
      token: adminToken,
      method: 'POST',
      body: {},
    });
    assert.equal(r.status, 200);
    const saved = product.toObject();
    r = await api('/admin/products/' + product._id, {
      token: adminToken,
      method: 'PUT',
      body: { ...saved, images: [media.url] },
    });
    assert.equal(r.status, 200);
    r = await api('/admin/media/' + media._id + '/archive', {
      token: adminToken,
      method: 'PATCH',
      body: {},
    });
    assert.equal(r.status, 409);
    await api('/admin/products/' + product._id, {
      token: adminToken,
      method: 'PUT',
      body: { ...saved, images: [] },
    });
    r = await api('/admin/settings', {
      token: adminToken,
      method: 'PUT',
      body: {
        heroImage: media.url,
        collectionCovers: [{ category: 'QA Fixtures', image: media.url }],
      },
    });
    assert.equal(r.status, 200);
    assert.equal((await api('/products/collections')).data.covers['QA Fixtures'], media.url);
    r = await api('/admin/media/' + media._id + '/archive', {
      token: adminToken,
      method: 'PATCH',
      body: {},
    });
    assert.equal(r.status, 409);
    await api('/admin/settings', {
      token: adminToken,
      method: 'PUT',
      body: { heroImage: '', collectionCovers: [] },
    });
    r = await api('/admin/media/' + media._id + '/archive', {
      token: adminToken,
      method: 'PATCH',
      body: {},
    });
    assert.equal(r.status, 200);
    assert.equal((await api('/admin/media', { token: adminToken })).data.total, 0);
    r = await api('/admin/products/' + product._id, {
      token: adminToken,
      method: 'PUT',
      body: { ...saved, images: [media.url] },
    });
    assert.equal(r.status, 400);
    r = await api('/admin/media/' + media._id + '/archive', {
      token: adminToken,
      method: 'PATCH',
      body: { restore: true },
    });
    assert.equal(r.status, 200);
    assert.equal((await Media.findById(media._id)).status, 'ready');
    r = await api('/admin/settings', {
      token: adminToken,
      method: 'PUT',
      body: { heroImage: 'https://res.cloudinary.com/other/image/upload/not-registered.jpg' },
    });
    assert.equal(r.status, 400);
  } finally {
    sdk.api.upload_preset = original.preset;
    sdk.api.update_upload_preset = original.update;
    sdk.api.resource = original.resource;
    envKeys.forEach((key, index) => {
      if (previous[index] === undefined) delete process.env[key];
      else process.env[key] = previous[index];
    });
  }
});

test('tampered totals roll back inventory and a valid COD order is durable and idempotent', async () => {
  const body = bodyFor(product, 2);
  let r = await api('/orders', {
    token: customerToken,
    method: 'POST',
    body: { ...body, expectedTotal: 1 },
  });
  assert.equal(r.status, 409);
  assert.equal((await Product.findById(product._id)).variants[0].stock, 8);
  r = await api('/orders', { token: customerToken, method: 'POST', body });
  assert.equal(r.status, 201);
  accountOrder = r.data.order;
  createdOrders.push(accountOrder._id);
  assert.equal(accountOrder.total, 277);
  assert.equal(accountOrder.items[0].price, 100);
  assert.equal(accountOrder.requestKey, undefined);
  assert.equal(accountOrder.guestTokenHash, undefined);
  assert.equal((await Product.findById(product._id)).variants[0].stock, 6);
  r = await api('/orders', { token: customerToken, method: 'POST', body });
  assert.equal(r.status, 200);
  assert.equal(r.data.order._id, accountOrder._id);
  const changed = await api('/orders', {
    token: customerToken,
    method: 'POST',
    body: {
      ...body,
      shippingAddress: { ...body.shippingAddress, street: 'Changed after original checkout' },
    },
  });
  assert.equal(changed.status, 409);
  assert.equal(changed.data.savedOrder._id, accountOrder._id);
  assert.equal((await Product.findById(product._id)).variants[0].stock, 6);
  r = await api('/cart', { token: customerToken });
  assert.equal(r.data.cart.items.length, 0);
});
test('order access checks ownership and guest tracking cannot expose account orders', async () => {
  let r = await api('/orders/' + accountOrder.orderNumber);
  assert.equal(r.status, 404);
  r = await api('/orders/' + accountOrder.orderNumber, { token: customerToken });
  assert.equal(r.status, 200);
  r = await api('/orders/my-orders', { token: customerToken });
  assert.ok(r.data.orders.some((o) => o._id === accountOrder._id));
});
test('concurrent attempts for the last unit produce one order and never negative stock', async () => {
  const results = await Promise.all([
    api('/orders', { method: 'POST', body: bodyFor(limited) }),
    api('/orders', { method: 'POST', body: bodyFor(limited) }),
  ]);
  assert.deepEqual(results.map((r) => r.status).sort(), [201, 409]);
  const saved = results.find((r) => r.status === 201).data;
  guestOrder = saved.order;
  trackingToken = saved.trackingToken;
  createdOrders.push(guestOrder._id);
  assert.equal((await Product.findById(limited._id)).variants[0].stock, 0);
  let r = await api('/orders/' + guestOrder.orderNumber, {
    headers: { 'X-Order-Token': 'invalid' },
  });
  assert.equal(r.status, 404);
  r = await api('/orders/' + guestOrder.orderNumber, {
    headers: { 'X-Order-Token': trackingToken },
  });
  assert.equal(r.status, 200);
  assert.equal(r.data.order.guestTokenHash, undefined);
});
test('cancel and reopen reconcile inventory exactly once and cash is independent', async () => {
  let r = await api('/admin/orders/' + guestOrder._id + '/status', {
    token: adminToken,
    method: 'PATCH',
    body: { status: 'cancelled' },
  });
  assert.equal(r.status, 200);
  assert.equal((await Product.findById(limited._id)).variants[0].stock, 1);
  r = await api('/admin/orders/' + guestOrder._id + '/status', {
    token: adminToken,
    method: 'PATCH',
    body: { status: 'cancelled' },
  });
  assert.equal(r.status, 200);
  assert.equal((await Product.findById(limited._id)).variants[0].stock, 1);
  r = await api('/admin/orders/' + guestOrder._id + '/status', {
    token: adminToken,
    method: 'PATCH',
    body: { status: 'delivered' },
  });
  assert.equal(r.status, 200);
  assert.equal(r.data.order.paymentStatus, 'unpaid');
  assert.equal((await Product.findById(limited._id)).variants[0].stock, 0);
  r = await api('/admin/orders/' + guestOrder._id + '/payment', {
    token: adminToken,
    method: 'PATCH',
    body: { paymentStatus: 'cash_collected' },
  });
  assert.equal(r.status, 200);
  r = await api('/admin/orders/' + guestOrder._id + '/status', {
    token: adminToken,
    method: 'PATCH',
    body: { status: 'cancelled' },
  });
  assert.equal(r.status, 409);
});
test('customer cancellation releases stock, product delete and restore preserve records', async () => {
  let r = await api('/orders/' + accountOrder._id + '/cancel', {
    token: customerToken,
    method: 'POST',
    body: { reason: 'QA test cleanup' },
  });
  assert.equal(r.status, 200);
  assert.equal((await Product.findById(product._id)).variants[0].stock, 8);
  r = await api('/admin/products/' + product._id, { token: adminToken, method: 'DELETE' });
  assert.equal(r.status, 200);
  r = await api('/products/' + product._id);
  assert.equal(r.status, 404);
  r = await api('/admin/products/' + product._id + '/restore', {
    token: adminToken,
    method: 'PATCH',
  });
  assert.equal(r.status, 200);
  r = await api('/products/' + product._id);
  assert.equal(r.status, 200);
});
test('support inbox and manual password reset invalidate the old session', async () => {
  let r = await api('/contact', {
    method: 'POST',
    body: { name: 'QA', email: mail, message: 'AUTOMATED QA SUPPORT TEST' },
  });
  assert.equal(r.status, 201);
  r = await api('/auth/forgot-password', { method: 'POST', body: { identifier: mail } });
  assert.equal(r.status, 200);
  const requests = await api('/admin/password-requests?status=pending', { token: adminToken });
  const request = requests.data.requests.find((a) => a.email === mail);
  assert.ok(request);
  r = await api('/admin/password-requests/' + request._id + '/fulfill', {
    token: adminToken,
    method: 'POST',
    body: { newPassword: password + 'x', adminNotes: 'QA verification' },
  });
  assert.equal(r.status, 200);
  r = await api('/users/profile', { token: customerToken });
  assert.equal(r.status, 401);
  r = await api('/auth/login', { method: 'POST', body: { email: mail, password: password + 'x' } });
  assert.equal(r.status, 200);
  customerToken = r.data.token;
});
test('ban, unban, deactivate and restore work while administrator accounts are protected', async () => {
  let r = await api('/admin/users/' + customer.id + '/ban', {
    token: adminToken,
    method: 'PATCH',
    body: { reason: 'QA suspension' },
  });
  assert.equal(r.status, 200);
  r = await api('/users/profile', { token: customerToken });
  assert.equal(r.status, 401);
  r = await api('/admin/users/' + customer.id + '/unban', { token: adminToken, method: 'PATCH' });
  assert.equal(r.status, 200);
  r = await api('/auth/login', { method: 'POST', body: { email: mail, password: password + 'x' } });
  customerToken = r.data.token;
  r = await api('/users/profile', {
    token: customerToken,
    method: 'DELETE',
    body: { password: password + 'x' },
  });
  assert.equal(r.status, 200);
  r = await api('/users/restore', {
    method: 'POST',
    body: { email: mail, password: password + 'x' },
  });
  assert.equal(r.status, 200);
  const admin = await User.findOne({ email: 'qa-admin-' + suffix + '@example.com' });
  r = await api('/admin/users/' + admin._id + '/ban', {
    token: adminToken,
    method: 'PATCH',
    body: { reason: 'Should fail' },
  });
  assert.equal(r.status, 403);
});
