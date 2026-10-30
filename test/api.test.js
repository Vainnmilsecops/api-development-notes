import assert from 'node:assert/strict';
import { once } from 'node:events';
import test from 'node:test';
import { createApp } from '../src/app.js';

const key = 'test-key';

async function start(t) {
  const server = createApp({ apiKey: key }).listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
    server.closeIdleConnections();
  }));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  return (path, { method = 'GET', body, raw, apiKey, contentType } = {}) => {
    const headers = {};
    if (apiKey !== undefined) headers['x-api-key'] = apiKey;
    if (body !== undefined || raw !== undefined) headers['Content-Type'] = 'application/json';
    if (contentType !== undefined) headers['Content-Type'] = contentType;
    return fetch(`${baseUrl}${path}`, {
      method, headers, body: raw !== undefined ? raw : JSON.stringify(body),
    });
  };
}

async function expectError(response, status) {
  assert.equal(response.status, status);
  assert.match(response.headers.get('content-type'), /application\/json/);
  const body = await response.json();
  assert.equal(typeof body.error.message, 'string');
  assert.ok(body.error.message.length > 0);
}

test('GET công khai và lọc trạng thái hoàn thành', async (t) => {
  const request = await start(t);
  const health = await request('/health');
  assert.equal(health.status, 200);
  assert.deepEqual(await health.json(), { status: 'ok' });
  const all = await (await request('/api/tasks')).json();
  assert.equal(all.data.length, 2);
  for (const completed of [true, false]) {
    const response = await request(`/api/tasks?completed=${completed}`);
    assert.equal(response.status, 200);
    const { data } = await response.json();
    assert.equal(data.length, 1);
    assert.equal(data[0].completed, completed);
  }
  for (const query of ['1', '', 'TRUE', 'true&completed=false']) {
    await expectError(await request(`/api/tasks?completed=${query}`), 400);
  }
});

test('CRUD: tạo, đọc, sửa và xóa task', async (t) => {
  const request = await start(t);
  const created = await request('/api/tasks', {
    method: 'POST', apiKey: key, body: { title: '  Ôn REST API  ' },
  });
  assert.equal(created.status, 201);
  const { data } = await created.json();
  assert.deepEqual(data, { id: 3, title: 'Ôn REST API', completed: false });
  const path = `/api/tasks/${data.id}`;
  assert.equal(created.headers.get('location'), path);
  assert.deepEqual(await (await request(path)).json(), { data });
  const updated = await request(path, {
    method: 'PATCH', apiKey: key, body: { title: '  Xong rồi  ', completed: true },
  });
  assert.equal(updated.status, 200);
  assert.deepEqual(await updated.json(), { data: { id: 3, title: 'Xong rồi', completed: true } });
  const removed = await request(path, { method: 'DELETE', apiKey: key });
  assert.equal(removed.status, 204);
  assert.equal(await removed.text(), '');
  await expectError(await request(path), 404);
});

test('thiếu hoặc sai key không được thay đổi dữ liệu', async (t) => {
  const request = await start(t);
  const before = await (await request('/api/tasks')).json();
  for (const apiKey of [undefined, 'wrong-key']) {
    for (const method of ['POST', 'PATCH', 'DELETE']) {
      const path = method === 'POST' ? '/api/tasks' : '/api/tasks/1';
      await expectError(await request(path, {
        method, apiKey, body: method === 'DELETE' ? undefined : { title: 'Không được lưu' },
      }), 401);
    }
  }
  assert.deepEqual(await (await request('/api/tasks')).json(), before);
});

test('kiểm tra body trước khi ghi dữ liệu', async (t) => {
  const request = await start(t);
  const invalid = [null, [], {}, { title: '' }, { title: '   ' }, { title: 42 },
    { title: 'a'.repeat(121) }, { title: 'Task', completed: 'false' },
    { title: 'Task', extra: true }];
  for (const body of invalid) {
    await expectError(await request('/api/tasks', { method: 'POST', apiKey: key, body }), 400);
  }
  for (const body of [null, [], {}, { completed: null }, { unexpected: 'field' }]) {
    await expectError(await request('/api/tasks/1', { method: 'PATCH', apiKey: key, body }), 400);
  }
  const valid = await request('/api/tasks', {
    method: 'POST', apiKey: key, body: { title: 'a'.repeat(120), completed: true },
  });
  assert.equal(valid.status, 201);
  const { data } = await valid.json();
  assert.equal(data.id, 3);
  assert.equal(data.completed, true);
});

test('JSON lỗi, thiếu body, sai Content-Type và body quá lớn', async (t) => {
  const request = await start(t);
  for (const [extra, status] of [
    [{ raw: '{"title":' }, 400],
    [{ contentType: 'application/json' }, 400],
    [{ raw: 'title=Task', contentType: 'text/plain' }, 415],
    [{ body: { title: 'a'.repeat(11 * 1024) } }, 413],
  ]) {
    await expectError(await request('/api/tasks', { method: 'POST', apiKey: key, ...extra }), status);
  }
});

test('ID sai, task không tồn tại và endpoint lạ', async (t) => {
  const request = await start(t);
  for (const id of ['abc', '0', '-1', '1.5', '01', '9007199254740992']) {
    await expectError(await request(`/api/tasks/${id}`), 400);
  }
  await expectError(await request('/api/tasks/999'), 404);
  for (const method of ['PATCH', 'DELETE']) {
    await expectError(await request('/api/tasks/999', {
      method, apiKey: key, body: method === 'PATCH' ? { completed: true } : undefined,
    }), 404);
  }
  await expectError(await request('/khong-co-route-nay'), 404);
});
