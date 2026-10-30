import { createApp } from './app.js';

const port = Number(process.env.PORT ?? 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT phải là số nguyên từ 1 đến 65535.');
}

const app = createApp({ apiKey: process.env.API_KEY });
const server = app.listen(port, '127.0.0.1', () => {
  console.log(`API đang chạy tại http://localhost:${port}`);
});

server.on('error', (err) => {
  console.error(`Không mở được server: ${err.message}`);
  process.exitCode = 1;
});
