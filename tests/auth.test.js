import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import User from '../server/models/User.js';
import { generateToken, verifyTokenUtil } from '../server/utils/jwt.js';
import { register, login } from '../server/controllers/authController.js';

function response() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

test('Mongoose save hook hashes passwords and preserves hashes on unrelated saves', async () => {
  const user = new User({
    name: 'Test',
    email: 'test@example.com',
    mobile: '0000000000',
    password: 'test-password-123',
  });
  await User.schema.s.hooks.execPre('save', user, [{}]);
  assert.notEqual(user.password, 'test-password-123');
  assert.equal(await user.comparePassword('test-password-123'), true);
  assert.equal(await user.comparePassword('incorrect'), false);
  const hash = user.password;
  user.unmarkModified('password');
  await User.schema.s.hooks.execPre('save', user, [{}]);
  assert.equal(user.password, hash);
});

test('JWT secret is required, read at call time, and signatures are verified', () => {
  const original = process.env.JWT_SECRET;
  try {
    delete process.env.JWT_SECRET;
    assert.throws(() => generateToken({ id: 'test' }));
    process.env.JWT_SECRET = randomBytes(32).toString('hex');
    const token = generateToken({ id: 'test', role: 'customer' });
    assert.equal(verifyTokenUtil(token).id, 'test');
    process.env.JWT_SECRET = randomBytes(32).toString('hex');
    assert.throws(() => verifyTokenUtil(token));
  } finally {
    if (original === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = original;
  }
});

test('registration rejects malformed fields and short passwords', async () => {
  for (const body of [
    { name: 'Test', email: { $ne: null }, password: 'testpass123', mobile: '0000000000' },
    { name: 'Test', email: 'test@example.com', password: 'short', mobile: '0000000000' },
  ]) {
    const res = response();
    await register({ body }, res);
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.token, undefined);
  }
});

test('disconnected registration and admin-looking login never issue scaffold sessions', async () => {
  const res = response();
  await register(
    {
      body: {
        name: 'Test',
        email: 'test@example.com',
        password: 'testpass123',
        mobile: '0000000000',
      },
    },
    res,
  );
  assert.equal(res.statusCode, 503);
  assert.equal(res.body.token, undefined);
  const loginRes = response();
  await login({ body: { email: 'admin@example.com', password: 'anything' } }, loginRes);
  assert.equal(loginRes.statusCode, 503);
  assert.equal(loginRes.body.token, undefined);
});
