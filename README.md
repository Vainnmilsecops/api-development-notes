# API development notes

Ghi chú các phần cơ bản của API development, kèm một API quản lý việc cần làm để thử request trực tiếp. Code dùng JavaScript và Express, dữ liệu lưu trong bộ nhớ.

## Ghi chú

1. [API và REST API](notes/01-api-va-rest.md)
2. [Request – Response](notes/02-request-response.md)
3. [API authentication](notes/03-authentication.md)
4. [API document](notes/04-api-document.md)
5. [Tools và template](notes/05-tools-va-template.md)

Có thể đọc theo thứ tự trên, rồi mở `src/app.js` để đối chiếu với code.

## Chạy thử

Cần Node.js 22 trở lên. Trong thư mục repo, chạy bằng PowerShell:

```powershell
npm install
Copy-Item .env.example .env
npm start
```

Trên macOS/Linux dùng `cp .env.example .env` thay lệnh `Copy-Item`. Chỉ cần sao chép file môi trường lần đầu; nếu đã có `.env` thì giữ file đang dùng.

Server chạy tại `http://localhost:3000`. Muốn tự khởi động lại khi sửa code thì dùng `npm run dev`. Có thể đổi `PORT` và `API_KEY` trong `.env`.

```powershell
curl.exe http://localhost:3000/api/tasks
```

Cài extension **REST Client** trong VS Code, mở [requests.http](requests.http) rồi bấm **Send Request** trên từng request. Nếu đổi key hoặc port trong `.env`, sửa hai biến đầu file này cho khớp. Chạy lần lượt các request thành công trước khi thử những request lỗi ở cuối file.

## API mẫu có gì?

- `GET /health`: kiểm tra server.
- `GET /api/tasks`: lấy danh sách; thêm `?completed=false` để lọc việc chưa xong.
- `GET /api/tasks/:id`: xem một task.
- `POST /api/tasks`: tạo task với `title` và `completed` (không bắt buộc).
- `PATCH /api/tasks/:id`: sửa `title` hoặc `completed`.
- `DELETE /api/tasks/:id`: xóa task, trả `204` với body rỗng.

Các request ghi dữ liệu cần header `x-api-key`. Key mẫu trong `.env.example` chỉ dùng để thực hành tại máy. GET được mở để đọc dữ liệu demo; repo chưa có tài khoản, phân quyền theo người dùng hay database. Tắt rồi chạy lại server sẽ khôi phục hai task ban đầu.

Ví dụ tạo task:

```http
POST /api/tasks HTTP/1.1
Host: localhost:3000
Content-Type: application/json
x-api-key: local-practice-key

{"title":"Đọc về REST","completed":false}
```

Response thành công có dạng `{ "data": ... }`. Response lỗi có dạng `{ "error": { "message": "..." } }`. Body sai trả `400`, thiếu/sai key trả `401`, không có task trả `404`. Quy tắc và các response còn lại nằm trong [openapi.yaml](openapi.yaml); có thể import file này vào Swagger Editor hoặc Postman.

## Các file chính

```text
notes/           ghi chú theo từng chủ đề
src/app.js       routes, kiểm tra body và API key
src/server.js    đọc cấu hình, mở server
test/api.test.js kiểm tra hành vi HTTP
requests.http    request mẫu để chạy bằng REST Client
openapi.yaml     mô tả API
.env.example     cấu hình mẫu
```

Chạy kiểm tra bằng `npm test`. Test dùng HTTP thật trên một port tạm, không cần tạo `.env` và không dùng dữ liệu của server đang chạy.

## Tự thử thêm

- Gửi `completed` là chuỗi `"false"` rồi so với boolean `false`.
- Tạo một task, lấy `id` từ response rồi sửa và xóa nó.
- Gửi PATCH với `{}` hoặc một field lạ để xem lỗi validation.
- Viết thêm lọc theo từ khóa; sau đó cập nhật cả ghi chú, request mẫu và OpenAPI.
