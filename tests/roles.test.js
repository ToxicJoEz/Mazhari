import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from '../server/models/User.js';
import Product from '../server/models/Product.js';
import Order from '../server/models/Order.js';
import Cart from '../server/models/Cart.js';
import { getSettings } from '../server/controllers/storeController.js';
import { sessionFor } from '../server/controllers/authController.js';

dotenv.config({ quiet: true });
process.env.VERCEL = '1';

let server, base, adminToken, moderatorToken, customerToken, adminUser, moderatorUser, customerUser;

const suffix = randomBytes(6).toString('hex'),
  password = 'Qa-' + randomBytes(16).toString('hex'),
  createdUsers = [],
  createdProducts = [];

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

before(
  async () => {
    const { default: app } = await import('../server/app.js');
    await mongoose.connect(process.env.MONGODB_URI, { dbName: 'mazhari_roles_' + suffix });
    await Promise.all([User.init(), Order.init(), Cart.init()]);
    server = app.listen(0, '127.0.0.1');
    await new Promise((resolve) => server.once('listening', resolve));
    base = 'http://127.0.0.1:' + server.address().port + '/api';

    // 1. Create Admin
    adminUser = await User.create({
      name: 'QA Admin ' + suffix,
      email: 'admin-' + suffix + '@example.com',
      password,
      mobile: '+201000000001',
      role: 'admin',
    });
    createdUsers.push(adminUser._id);
    adminToken = sessionFor(adminUser).token;

    // 2. Create Moderator
    moderatorUser = await User.create({
      name: 'QA Moderator ' + suffix,
      email: 'mod-' + suffix + '@example.com',
      password,
      mobile: '+201000000002',
      role: 'moderator',
    });
    createdUsers.push(moderatorUser._id);
    moderatorToken = sessionFor(moderatorUser).token;

    // 3. Create Customer
    customerUser = await User.create({
      name: 'QA Customer ' + suffix,
      email: 'cust-' + suffix + '@example.com',
      password,
      mobile: '+201000000003',
      role: 'customer',
    });
    createdUsers.push(customerUser._id);
    customerToken = sessionFor(customerUser).token;

    await getSettings();
  },
  { timeout: 30000 },
);

after(
  async () => {
    try {
      if (createdUsers.length) await User.deleteMany({ _id: { $in: createdUsers } });
      if (createdProducts.length) await Product.deleteMany({ _id: { $in: createdProducts } });
    } finally {
      if (server) await new Promise((resolve) => server.close(resolve));
      try {
        if (
          mongoose.connection.name === 'mazhari_roles_' + suffix &&
          /^mazhari_roles_[a-f0-9]{12}$/.test(mongoose.connection.name)
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

test('Three tiers have distinct access: moderator can access products and orders, but not user management', async () => {
  // Moderator can access metrics, products, and orders
  let r = await api('/admin/metrics', { token: moderatorToken });
  assert.equal(r.status, 200);

  r = await api('/admin/products', { token: moderatorToken });
  assert.equal(r.status, 200);

  r = await api('/admin/orders', { token: moderatorToken });
  assert.equal(r.status, 200);

  // Moderator is FORBIDDEN from user management
  r = await api('/admin/users', { token: moderatorToken });
  assert.equal(r.status, 403);
  assert.equal(r.data.message, 'Administrator access required.');

  r = await api('/admin/users', {
    token: moderatorToken,
    method: 'POST',
    body: {
      name: 'Attempt',
      email: 'fail@example.com',
      mobile: '+201000000000',
      password: 'password123',
    },
  });
  assert.equal(r.status, 403);

  r = await api('/admin/users/' + customerUser._id, { token: moderatorToken });
  assert.equal(r.status, 403);

  r = await api('/admin/password-requests', { token: moderatorToken });
  assert.equal(r.status, 403);

  // Customer is FORBIDDEN from all staff endpoints
  r = await api('/admin/metrics', { token: customerToken });
  assert.equal(r.status, 403);

  r = await api('/admin/products', { token: customerToken });
  assert.equal(r.status, 403);

  r = await api('/admin/orders', { token: customerToken });
  assert.equal(r.status, 403);
});

test('Administrator can create other accounts specifying tier: customer, moderator, or admin', async () => {
  // Admin creates a new moderator
  const newModEmail = 'created-mod-' + suffix + '@example.com';
  let r = await api('/admin/users', {
    token: adminToken,
    method: 'POST',
    body: {
      name: 'Created Mod',
      email: newModEmail,
      mobile: '+201111111111',
      password: 'StrongModPassword123!',
      role: 'moderator',
    },
  });
  assert.equal(r.status, 201);
  assert.equal(r.data.user.role, 'moderator');
  assert.equal(r.data.user.email, newModEmail);
  const createdModId = r.data.user.id;
  createdUsers.push(createdModId);

  // Verify the newly created moderator can log in
  const loginRes = await api('/auth/login', {
    method: 'POST',
    body: { email: newModEmail, password: 'StrongModPassword123!' },
  });
  assert.equal(loginRes.status, 200);
  assert.equal(loginRes.data.user.role, 'moderator');

  // Admin can list users with role filtering
  r = await api('/admin/users?role=moderator', { token: adminToken });
  assert.equal(r.status, 200);
  assert.ok(r.data.users.some((u) => u.email === newModEmail));
});

test('Administrator can edit other accounts, change tier, ban and unban moderators', async () => {
  // Create a target user
  const targetEmail = 'target-' + suffix + '@example.com';
  let r = await api('/admin/users', {
    token: adminToken,
    method: 'POST',
    body: {
      name: 'Target User',
      email: targetEmail,
      mobile: '+201222222222',
      password: 'TargetPassword123!',
      role: 'customer',
    },
  });
  assert.equal(r.status, 201);
  const targetId = r.data.user.id;
  createdUsers.push(targetId);

  // Admin promotes customer to moderator
  r = await api('/admin/users/' + targetId, {
    token: adminToken,
    method: 'PUT',
    body: { name: 'Promoted Mod', role: 'moderator' },
  });
  assert.equal(r.status, 200);
  assert.equal(r.data.user.role, 'moderator');
  assert.equal(r.data.user.name, 'Promoted Mod');

  // Admin bans the moderator
  r = await api('/admin/users/' + targetId + '/ban', {
    token: adminToken,
    method: 'PATCH',
    body: { reason: 'Violated guidelines' },
  });
  assert.equal(r.status, 200);

  // Banned moderator cannot log in
  r = await api('/auth/login', {
    method: 'POST',
    body: { email: targetEmail, password: 'TargetPassword123!' },
  });
  assert.equal(r.status, 403);
  assert.match(r.data.message, /suspended/i);

  // Admin unbans the moderator
  r = await api('/admin/users/' + targetId + '/unban', {
    token: adminToken,
    method: 'PATCH',
  });
  assert.equal(r.status, 200);

  // Admin deactivates (soft deletes) the moderator
  r = await api('/admin/users/' + targetId, {
    token: adminToken,
    method: 'DELETE',
  });
  assert.equal(r.status, 200);

  // Admin restores the moderator
  r = await api('/admin/users/' + targetId + '/restore', {
    token: adminToken,
    method: 'PATCH',
  });
  assert.equal(r.status, 200);
});

test('Moderator can control stock and create products', async () => {
  // Moderator creates a product
  let r = await api('/admin/products', {
    token: moderatorToken,
    method: 'POST',
    body: {
      title: 'Mod Created Jacket ' + suffix,
      category: 'Moderator Edit',
      basePrice: 1950,
      variants: [{ color: 'Black', size: 'L', stock: 15 }],
    },
  });
  assert.equal(r.status, 201);
  const pId = r.data.product._id;
  createdProducts.push(pId);

  // Moderator updates stock
  r = await api('/admin/products/' + pId + '/stock', {
    token: moderatorToken,
    method: 'PATCH',
    body: { variants: [{ color: 'Black', size: 'L', stock: 25 }] },
  });
  assert.equal(r.status, 200);
  assert.equal(r.data.product.variants[0].stock, 25);
});
