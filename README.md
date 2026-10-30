# API development notes

Tổng hợp kiến thức nền về phát triển API, từ cách thiết kế endpoint đến xác thực, viết tài liệu và kiểm tra request. Các ví dụ dùng chung một bài toán quản lý việc cần làm để dễ nối lý thuyết với code.

README là phần ôn nhanh. Các file trong `notes/` giải thích kỹ hơn, có ví dụ, chỗ dễ nhầm và nguồn đọc thêm. API mẫu dùng JavaScript + Express, chỉ cần Node.js để chạy.

## Nội dung

1. [API và REST API](notes/01-api-va-rest.md): tài nguyên, HTTP method, REST constraints, idempotency, cache, phân trang và versioning.
2. [Request – Response](notes/02-request-response.md): URL, headers, body, status code, validation, CORS, timeout và cách tìm lỗi.
3. [API authentication](notes/03-authentication.md): API key, Basic, Bearer, JWT, session, OAuth 2.0, OpenID Connect và phân quyền.
4. [API document](notes/04-api-document.md): hợp đồng API, ví dụ endpoint, OpenAPI, Swagger và cách giữ tài liệu khớp code.
5. [Tools và template](notes/05-tools-va-template.md): REST Client, Postman, cURL, DevTools, mẫu ghi endpoint và các bước kiểm tra API.

## 1. API và REST API

API là giao diện để các chương trình làm việc với nhau. Web API thường dùng HTTP để client gửi yêu cầu đến server. API còn có thể là các hàm của thư viện, không nhất thiết đi qua mạng.

REST là một kiểu kiến trúc. Khi thiết kế HTTP API theo hướng tài nguyên, URL xác định tài nguyên, method cho biết thao tác:

```text
GET    /api/tasks       lấy danh sách
GET    /api/tasks/1     lấy một task
POST   /api/tasks       tạo task
PATCH  /api/tasks/1     sửa một phần
DELETE /api/tasks/1     xóa task
```

`PUT` thường thay thế biểu diễn của tài nguyên tại URL đã biết; `PATCH` áp dụng thay đổi một phần. API mẫu chỉ triển khai `PATCH`. Không dùng `GET /deleteTask` để xóa vì GET có ngữ nghĩa đọc dữ liệu.

REST có các ràng buộc về client/server, stateless, cache, giao diện thống nhất, phân lớp và code-on-demand tùy chọn. Dùng JSON và có đủ CRUD chưa đồng nghĩa đã đáp ứng toàn bộ REST; demo này chỉ minh họa cách xây HTTP API thường gặp.

Hai khái niệm cần nhớ khi gọi lại request:

- **Safe:** client không yêu cầu thay đổi dữ liệu qua thao tác đó. GET thuộc nhóm này, dù server vẫn có thể ghi log.
- **Idempotent:** gọi cùng request nhiều lần có tác động dự kiến như gọi một lần. DELETE có thể lần đầu trả `204`, lần sau trả `404` mà vẫn idempotent.

POST tạo mới thường tạo thêm bản ghi nếu gửi lại. Khi client bị timeout, chưa thể kết luận server chưa ghi dữ liệu; cần kiểm tra hoặc có cơ chế chống tạo trùng trước khi retry.

Với danh sách lớn, cần xác định bộ lọc, sắp xếp, phân trang và giới hạn số bản ghi. Cache và versioning cũng là một phần của thiết kế API, không chỉ là việc tối ưu sau cùng. Ví dụ phân trang/cursor, ETag và thay đổi tương thích nằm trong [chương 1](notes/01-api-va-rest.md); demo hiện chỉ lọc theo `completed`.

## 2. Request – Response

Một request gồm method, URL, headers và body nếu thao tác cần dữ liệu. Ví dụ tạo task:

```http
POST /api/tasks HTTP/1.1
Host: localhost:3000
Content-Type: application/json
Accept: application/json
x-api-key: local-practice-key

{"title":"Đọc về REST","completed":false}
```

Trong `GET /api/tasks/1`, `1` là path parameter. Trong `GET /api/tasks?completed=false`, `completed` là query parameter. Với Express, ba nguồn dữ liệu thường dùng là `req.params`, `req.query` và `req.body`.

`Content-Type` mô tả nội dung đang gửi; `Accept` diễn tả loại nội dung muốn nhận. Có header JSON chưa đủ để body trở thành JSON hợp lệ. JSON dùng dấu nháy kép, không nhận dấu phẩy thừa; boolean `false` khác chuỗi `"false"`.

Server trả status, headers và body:

```http
HTTP/1.1 201 Created
Content-Type: application/json; charset=utf-8
Location: /api/tasks/3

{"data":{"id":3,"title":"Đọc về REST","completed":false}}
```

Những status cần đọc được trước:

- `200`: xử lý thành công; `201`: tạo tài nguyên; `204`: thành công, không có body.
- `400`: request không hợp lệ; `401`: thiếu/sai xác thực; `403`: bị từ chối quyền truy cập.
- `404`: không có tài nguyên/route; `409`: xung đột; `415`: loại nội dung không hỗ trợ.
- `429`: vượt giới hạn gọi; `500`: lỗi trong server; `502/503/504`: lỗi gateway, dịch vụ chưa sẵn sàng hoặc timeout ở gateway.

Demo không triển khai tất cả status trên. Response thành công dùng `{ "data": ... }`, trừ `/health` và DELETE; lỗi dùng `{ "error": { "message": "..." } }`. Đây là quy ước của repo, không phải định dạng bắt buộc cho mọi API.

Validation phải chạy ở server: kiểm tra kiểu, trường bắt buộc, độ dài và quyền thao tác. Frontend kiểm tra sẵn giúp người dùng nhập liệu thuận tiện nhưng request vẫn có thể được gửi từ công cụ khác.

CORS là cơ chế trình duyệt dùng để kiểm soát truy cập giữa các origin. Postman gọi được còn frontend báo CORS thì cần kiểm tra cấu hình origin, headers và preflight; bỏ xác thực không phải cách sửa CORS. Xem [chương 2](notes/02-request-response.md) để đọc luồng request và phân biệt lỗi HTTP với lỗi mạng.

## 3. API authentication

**Authentication** kiểm tra bên gọi là ai hoặc có thông tin xác thực nào. **Authorization** kiểm tra họ được làm gì với tài nguyên cụ thể. Có token hợp lệ chưa đủ để cho phép đọc task của người khác.

Các cách thường gặp:

- **API key:** secret cấp cho bên gọi. Demo dùng header `x-api-key`, đọc từ `API_KEY` trong `.env`.
- **Basic:** gửi thông tin `username:password` qua Base64. Base64 có thể giải ngược; cần HTTPS để bảo vệ khi truyền.
- **Bearer:** ai có token có thể dùng quyền token cấp. Token có thể là JWT hoặc chuỗi opaque.
- **Session cookie:** trình duyệt gửi mã phiên, server tra phiên để xác định người dùng. Cần cấu hình cookie và xử lý rủi ro CSRF phù hợp.
- **OAuth 2.0:** cấp quyền cho ứng dụng truy cập tài nguyên. OpenID Connect bổ sung lớp xác thực người dùng trên OAuth 2.0.

JWT có chữ ký thường gồm `header.payload.signature`. Decode payload chỉ giúp đọc claims; server còn phải xác minh chữ ký, thời hạn và các claims phù hợp như issuer/audience. Chữ ký không che giấu nội dung payload. Xóa token ở client cũng không tự thu hồi mọi bản sao đang tồn tại.

Không commit secret thật, đưa secret vào URL hoặc nhúng key bí mật vào JavaScript gửi cho trình duyệt. Ứng dụng thực tế còn cần HTTPS, quản lý vòng đời token/key và kiểm tra quyền trên từng tài nguyên. Chi tiết access/refresh token, PKCE, session và quyền sở hữu nằm ở [chương 3](notes/03-authentication.md).

Demo chỉ có một API key dùng chung: GET công khai; POST/PATCH/DELETE cần key. Chưa có đăng nhập, JWT, người dùng hay phân quyền theo chủ sở hữu.

## 4. API document

Một người khác cần gọi được endpoint mà chưa phải mở code xử lý. Mỗi endpoint nên có:

- Method, URL, mục đích và yêu cầu xác thực.
- Path/query parameters, headers, body và quy tắc kiểm tra.
- Ví dụ request và response có thể đối chiếu được.
- Status thành công, lỗi có thể xảy ra, tác động khi gọi lặp lại.
- Giới hạn, cách phân trang và các thay đổi ảnh hưởng client nếu có.

OpenAPI mô tả hợp đồng HTTP API bằng YAML/JSON. Swagger là bộ công cụ, ví dụ Swagger Editor để đọc/sửa đặc tả và Swagger UI để hiển thị tài liệu tương tác. Khai báo OpenAPI không tự làm server kiểm tra request; code hoặc middleware vẫn phải thực thi các quy tắc đó.

Repo có [openapi.yaml](openapi.yaml) mô tả API mẫu bằng OpenAPI 3.0.3, không dựng sẵn Swagger UI. [Chương 4](notes/04-api-document.md) giải thích cấu trúc đặc tả và có ví dụ tài liệu cho POST/PATCH.

Khi đổi endpoint, cập nhật cả code, tài liệu, request mẫu và kiểm tra liên quan. Đổi tên field hoặc biến field tùy chọn thành bắt buộc có thể làm client cũ hỏng ngay cả khi URL vẫn giữ nguyên.

## 5. API tool và template

Trong repo này, dùng các công cụ theo nhu cầu:

- **REST Client:** mở [requests.http](requests.http) trong VS Code rồi bấm **Send Request**. Request là file văn bản, dễ lưu cùng source.
- **cURL / Invoke-RestMethod:** gửi nhanh từ terminal; cURL có `-i` để xem cả response headers. Trên Windows dùng `curl.exe` để tránh alias ở một số phiên bản PowerShell.
- **Postman:** lưu collection, đặt biến môi trường, gửi request và kiểm tra response bằng script.
- **Browser DevTools:** xem request thật từ frontend, preflight, headers, status và thời gian chờ.
- **Swagger Editor:** đọc và kiểm tra file OpenAPI.
- **`npm test`:** chạy các kiểm tra HTTP tự động của API mẫu.

Khi gặp lỗi, kiểm tra lần lượt server/port, URL và method, thông tin xác thực, `Content-Type`, rồi body và response. Lưu một request thành công làm mốc để so sánh, thay vì đổi nhiều thứ cùng lúc.

[Chương 5](notes/05-tools-va-template.md) có thao tác cụ thể, mẫu tài liệu endpoint và danh sách tình huống cần kiểm tra.

## Chạy API mẫu

Cần Node.js 22 trở lên. Sau khi clone và vào thư mục repo, chạy bằng PowerShell:

```powershell
npm install
Copy-Item .env.example .env
npm start
```

Trên macOS/Linux dùng `cp .env.example .env` thay lệnh `Copy-Item`. Chỉ sao chép ở lần đầu; nếu đã có `.env` thì giữ cấu hình đang dùng.

Server chạy tại `http://localhost:3000`. `npm run dev` tự khởi động lại khi sửa code. Nếu đổi `PORT` hoặc `API_KEY` trong `.env`, sửa hai biến đầu `requests.http` cho khớp.

```powershell
curl.exe -i http://localhost:3000/api/tasks
```

Quy tắc của API mẫu:

- Task có `id`, `title`, `completed`; ID do server tạo.
- POST bắt buộc `title`; `completed` mặc định `false`. PATCH cần ít nhất một trong hai trường.
- `title` sau trim dài 1–120 theo cách đếm chuỗi của JavaScript; `completed` phải là boolean. Không nhận trường ngoài hai trường trên.
- Body tạo/sửa phải là JSON và không quá 10 KB. Dữ liệu sai trả `400`, thiếu/sai key trả `401`, body quá lớn trả `413`, loại nội dung sai trả `415`.
- GET `/health` trả `{ "status": "ok" }`; GET `/api/tasks` hỗ trợ `?completed=true` hoặc `false`; GET `/api/tasks/:id` trả một task.
- POST trả `201` kèm `Location`; PATCH trả `200`; DELETE trả `204` với body rỗng.
- Dữ liệu nằm trong bộ nhớ, khởi động lại trở về hai task ban đầu. Response đặt `Cache-Control: no-store`.

Các ví dụ về database, phân trang, JWT, refresh token và rate limit trong ghi chú là kiến thức mở rộng; API mẫu chưa triển khai các phần này. Express vẫn có thể tự sinh ETag và trả `304` cho conditional GET; ứng dụng không xây dựng chiến lược cache riêng.

## File trong repo

```text
notes/           5 chương ghi chú
src/app.js       routes, kiểm tra body và API key
src/server.js    đọc cấu hình, mở server
test/api.test.js kiểm tra hành vi HTTP
requests.http    request mẫu cho REST Client
openapi.yaml     mô tả API mẫu
.env.example     cấu hình dùng thử; .env được bỏ qua bởi Git
```

Chạy `npm test` để kiểm tra CRUD, API key, bộ lọc, validation và một số lỗi HTTP. Test mở server trên port tạm, không cần `.env` và không dùng dữ liệu của server đang chạy.

## Bài tập tự kiểm tra

1. Tạo một task, dùng ID trong response để đọc, sửa rồi xóa. Gọi DELETE thêm lần nữa và giải thích kết quả.
2. So sánh `completed: false` với `completed: "false"`, và body rỗng với JSON sai cú pháp.
3. Thử PATCH `{}`, gửi field lạ và gửi request thiếu API key; giải thích lỗi xảy ra ở bước nào.
4. Giải thích vì sao stateless vẫn dùng được database, vì sao decode JWT chưa đủ để xác thực, và vì sao CORS không thay cho phân quyền.
5. Thêm lọc task theo từ khóa. Cập nhật code, request mẫu, OpenAPI và tài liệu cho tham số mới.
6. Thiết kế phân trang hoặc phân quyền theo người dùng trên giấy trước khi code. Ghi rõ request, response, trường hợp lỗi và thay đổi nào có thể làm client cũ hỏng.

Nguồn chính thức và phần đọc thêm được đặt ở cuối từng chương, gồm MDN, các RFC liên quan, tài liệu Express và OpenAPI.
