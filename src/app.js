import express from 'express';

export function createApp({ apiKey }) {
  if (typeof apiKey !== 'string' || !apiKey.trim()) {
    throw new Error('Chưa có API_KEY. Sao chép .env.example thành .env trước khi chạy.');
  }

  const app = express();
  app.disable('x-powered-by');
  app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });

  // Lưu tạm để tập trung vào HTTP. Khởi động lại sẽ về dữ liệu ban đầu.
  let tasks = [
    { id: 1, title: 'Đọc lại HTTP status codes', completed: false },
    { id: 2, title: 'Thử gửi request bằng REST Client', completed: true },
  ];
  let nextId = 3;

  function requireApiKey(req, res, next) {
    if (req.get('x-api-key') !== apiKey) {
      return res.status(401).json({ error: { message: 'API key thiếu hoặc không đúng.' } });
    }
    next();
  }

  function requireJson(req, res, next) {
    const contentType = req.get('Content-Type')?.split(';')[0].trim().toLowerCase();
    if (contentType !== 'application/json') {
      return res.status(415).json({ error: { message: 'Cần gửi Content-Type: application/json.' } });
    }
    next();
  }

  const parseJson = express.json({ limit: '10kb', strict: false });

  function validateTask(body, partial = false) {
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return 'Body phải là một JSON object.';
    }
    const fields = Object.keys(body);
    if (fields.some((field) => !['title', 'completed'].includes(field))) {
      return 'Body chỉ nhận title và completed.';
    }
    if (partial && fields.length === 0) {
      return 'Cần gửi ít nhất title hoặc completed.';
    }
    if (!partial || Object.hasOwn(body, 'title')) {
      if (typeof body.title !== 'string' || !body.title.trim() || body.title.trim().length > 120) {
        return 'title phải là chuỗi từ 1 đến 120 ký tự sau khi bỏ khoảng trắng ở hai đầu.';
      }
    }
    if (Object.hasOwn(body, 'completed') && typeof body.completed !== 'boolean') {
      return 'completed phải là true hoặc false, không phải chuỗi.';
    }
    return null;
  }

  function findTask(req, res, next) {
    const id = Number(req.params.id);
    if (!/^[1-9]\d*$/.test(req.params.id) || !Number.isSafeInteger(id)) {
      return res.status(400).json({ error: { message: 'id phải là số nguyên dương.' } });
    }
    req.task = tasks.find((task) => task.id === id);
    if (!req.task) {
      return res.status(404).json({ error: { message: 'Không tìm thấy task.' } });
    }
    next();
  }

  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  app.get('/api/tasks', (req, res) => {
    const { completed } = req.query;
    if (completed !== undefined && completed !== 'true' && completed !== 'false') {
      return res.status(400).json({ error: { message: 'completed chỉ nhận true hoặc false.' } });
    }
    const data = completed === undefined
      ? tasks
      : tasks.filter((task) => task.completed === (completed === 'true'));
    res.json({ data });
  });

  app.get('/api/tasks/:id', findTask, (req, res) => {
    res.json({ data: req.task });
  });

  app.post('/api/tasks', requireApiKey, requireJson, parseJson, (req, res) => {
    const message = validateTask(req.body);
    if (message) return res.status(400).json({ error: { message } });

    const task = {
      id: nextId++,
      title: req.body.title.trim(),
      completed: req.body.completed ?? false,
    };
    tasks.push(task);
    res.location(`/api/tasks/${task.id}`).status(201).json({ data: task });
  });

  app.patch('/api/tasks/:id', requireApiKey, requireJson, parseJson, findTask, (req, res) => {
    const message = validateTask(req.body, true);
    if (message) return res.status(400).json({ error: { message } });

    if (Object.hasOwn(req.body, 'title')) req.task.title = req.body.title.trim();
    if (Object.hasOwn(req.body, 'completed')) req.task.completed = req.body.completed;
    res.json({ data: req.task });
  });

  app.delete('/api/tasks/:id', requireApiKey, findTask, (req, res) => {
    tasks = tasks.filter((task) => task.id !== req.task.id);
    res.status(204).end();
  });

  app.use((req, res) => {
    res.status(404).json({ error: { message: 'Endpoint không tồn tại.' } });
  });

  app.use((err, req, res, next) => {
    if (err.type === 'entity.parse.failed') {
      return res.status(400).json({ error: { message: 'JSON không hợp lệ. Kiểm tra dấu phẩy và dấu ngoặc.' } });
    }
    if (err.status === 413) {
      return res.status(413).json({ error: { message: 'Body vượt quá 10 KB.' } });
    }
    if (err.status === 415) {
      return res.status(415).json({ error: { message: 'Encoding hoặc charset không được hỗ trợ.' } });
    }
    if (err.status === 400) {
      return res.status(400).json({ error: { message: 'Request không hợp lệ.' } });
    }
    console.error(err);
    res.status(500).json({ error: { message: 'Server gặp lỗi.' } });
  });

  return app;
}
