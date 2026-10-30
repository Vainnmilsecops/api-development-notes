# API document

Tài liệu API là thỏa thuận giữa bên cung cấp và bên gọi: gửi gì, nhận gì, được phép làm gì và xử lý lỗi ra sao. Người viết frontend nên thử được một endpoint mà không phải mở code backend để đoán tên field.

Markdown hợp với phần giải thích, ví dụ và giới hạn. OpenAPI hợp với mô tả có cấu trúc để công cụ đọc. Trong repo này, ghi chú đi cùng [openapi.yaml](../openapi.yaml), [requests.http](../requests.http) và code trong [app.js](../src/app.js).

## Một endpoint cần ghi những gì?

- Method, đường dẫn và mục đích. Nêu base URL riêng để không lặp địa chỉ ở mọi ví dụ.
- Xác thực: header nào, dùng kiểu credential gì, thao tác nào công khai.
- Path/query parameters: kiểu, giá trị hợp lệ, bắt buộc hay không, giá trị mặc định.
- Body: cấu trúc, field bắt buộc, kiểu dữ liệu, giới hạn, cách xử lý field lạ và `null`.
- Response thành công: status, header đáng chú ý, body mẫu.
- Lỗi: điều kiện xảy ra và cấu trúc response, không chỉ liệt kê mã status.
- Hành vi có ảnh hưởng đến client: phân trang, sắp xếp, cache, gọi lặp lại, giới hạn tần suất nếu có.

`required` và `nullable` là hai chuyện khác nhau: field có thể bắt buộc xuất hiện nhưng không cho nhận `null`. Ví dụ `title` của demo bắt buộc khi tạo và không chấp nhận `null`.

## Viết rõ hợp đồng của Tasks API

Base URL khi chạy ở máy: `http://localhost:3000`. Tài nguyên task gồm `id`, `title`, `completed`. Dữ liệu nằm trong bộ nhớ; restart server sẽ quay về hai task mẫu.

### Tạo công việc

`POST /api/tasks`

Cần header `x-api-key` bằng `API_KEY` trong `.env` và `Content-Type: application/json`.

```http
POST /api/tasks HTTP/1.1
Host: localhost:3000
Content-Type: application/json
x-api-key: local-practice-key

{"title":"  Đọc về REST API  ","completed":false}
```

- `title`: bắt buộc là chuỗi; server bỏ khoảng trắng hai đầu rồi kiểm tra độ dài từ 1 đến 120 theo cách đếm của JavaScript.
- `completed`: không bắt buộc, phải là boolean; không gửi thì mặc định `false`.
- Chỉ nhận hai field trên. Gửi thêm `id`, `owner` hoặc field khác sẽ bị từ chối.
- Body phải là object; không nhận mảng, `null` hoặc chuỗi. Body vượt 10 KB bị từ chối.

Response minh họa:

```http
HTTP/1.1 201 Created
Content-Type: application/json; charset=utf-8
Location: /api/tasks/3
Cache-Control: no-store

{"data":{"id":3,"title":"Đọc về REST API","completed":false}}
```

Lấy `id` hoặc `Location` từ response thực tế. Không mặc định ID mới luôn là `3`; gửi lại POST sẽ tạo một task khác.

Các lỗi của thao tác này:

- `400`: JSON sai cú pháp, thiếu body hoặc không đúng quy tắc field ở trên.
- `401`: thiếu key hoặc key sai. Middleware kiểm tra key trước khi đọc JSON.
- `413`: body lớn hơn giới hạn parser `10kb`, tương ứng 10.240 byte sau giải nén nếu có.
- `415`: thiếu/sai `Content-Type`, hoặc encoding/charset không hỗ trợ.
- `500`: lỗi ngoài dự kiến phía server.

Ví dụ gửi `completed` là chuỗi `"false"` sẽ nhận:

```json
{
  "error": {
    "message": "completed phải là true hoặc false, không phải chuỗi."
  }
}
```

`message` giúp người đọc tìm lỗi. Nếu client cần rẽ nhánh theo từng lỗi nghiệp vụ, có thể thiết kế thêm `code` ổn định; demo chưa có field đó.

### Sửa công việc

`PATCH /api/tasks/{id}` dùng cùng hai header của POST. ID phải là số nguyên dương trong miền số nguyên an toàn của JavaScript, viết dạng thập phân không có số `0` đứng đầu.

```http
PATCH /api/tasks/1 HTTP/1.1
Host: localhost:3000
Content-Type: application/json
x-api-key: local-practice-key

{"completed":true}
```

Server trả `200` với toàn bộ task sau cập nhật:

```json
{
  "data": {
    "id": 1,
    "title": "Đọc lại HTTP status codes",
    "completed": true
  }
}
```

Không gửi `title` thì giữ nguyên title; gửi `completed: false` là cập nhật thành false. `{}` không có gì để sửa nên nhận `400`. Field được gửi vẫn phải qua các quy tắc giống POST; `null` không mang nghĩa “xóa field”.

Ngoài lỗi body/key/media type/size như POST, PATCH có `400` cho ID sai định dạng và `404` cho task không tồn tại. Trình tự middleware là key → media type → parse JSON → tìm task → kiểm tra field, nên một request có nhiều lỗi có thể bị từ chối ngay ở bước đầu.

### Những endpoint còn lại

- `GET /health`: công khai, trả `200` với `{"status":"ok"}`.
- `GET /api/tasks`: công khai, trả `200` với `{"data":[...]}`. Danh sách rỗng vẫn là `200` với `data: []`.
- `GET /api/tasks?completed=false`: lọc việc chưa xong. Query chỉ nhận `true` hoặc `false`; sai giá trị nhận `400`. Demo chưa có phân trang hay tìm theo từ khóa.
- `GET /api/tasks/{id}`: công khai, trả một task; ID sai nhận `400`, ID hợp lệ nhưng không có dữ liệu nhận `404`.
- `DELETE /api/tasks/{id}`: cần key, trả `204` và body rỗng. Không gọi `response.json()` trên response này. Xóa lại cùng ID nhận `404`.

Demo chưa có PUT, tài khoản, quyền sở hữu task hoặc rate limit. Không ghi các tính năng đó như thể API đã hỗ trợ.

## OpenAPI và Swagger

OpenAPI là đặc tả mô tả HTTP API bằng YAML hoặc JSON. Swagger là bộ công cụ, trong đó Swagger Editor dùng để soạn/kiểm tra mô tả, Swagger UI dựng giao diện xem và gọi API. Có file OpenAPI không đồng nghĩa server tự có trang `/docs`.

Repo dùng `openapi: 3.0.3`. Đây là phiên bản định dạng tài liệu; `info.version: 1.0.0` là phiên bản API. Hai giá trị không cần giống nhau. Khi xem hướng dẫn, chọn đúng nhánh 3.0 vì có những khác biệt với 3.1 trở lên.

Đoạn rút từ cấu trúc trong repo:

```yaml
openapi: 3.0.3
info:
  title: Tasks API
  version: 1.0.0
servers:
  - url: http://localhost:3000
paths:
  /api/tasks:
    post:
      security:
        - ApiKey: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateTask'
```

Đây chỉ là đoạn trích; xem file đầy đủ để có `responses` và `components`. Các phần cần nhớ:

- `paths` chứa đường dẫn, mỗi method là một operation. `parameters` khai báo path/query/header; `requestBody` mô tả body.
- `responses` ánh xạ status tới mô tả, header và schema body. Response `204` không khai báo body.
- `components.schemas` chứa kiểu dùng lại, ví dụ `Task`, `CreateTask`, `UpdateTask`, `Error`. `$ref` trỏ tới phần đã khai báo để tránh lặp.
- `components.securitySchemes` mô tả cách gửi credential. `security` ở operation mới áp dụng yêu cầu đó; chỉ khai báo scheme chưa bảo vệ endpoint.

Trong file hiện tại, GET không có yêu cầu security; POST/PATCH/DELETE dùng `ApiKey`. Việc thực sự từ chối request do middleware Express làm. OpenAPI không tự kiểm tra body hoặc xác thực chỉ vì đã khai báo trong YAML.

Nguồn: [OpenAPI 3.0.3](https://spec.openapis.org/oas/v3.0.3.html), [Swagger – What Is OpenAPI?](https://swagger.io/docs/specification/v3_0/about/).

## Viết trước hay sau code?

**API first:** thống nhất hợp đồng trước, viết mô tả và ví dụ, rồi backend/frontend làm theo. Hữu ích khi hai bên làm song song; hợp đồng vẫn cần điều chỉnh theo phản hồi thực tế.

**Code first:** triển khai rồi sinh/viết tài liệu từ code. Dễ bắt đầu với dự án nhỏ, nhưng annotation hoặc file mô tả vẫn có thể cũ nếu không cập nhật. Tài liệu được sinh tự động không bảo đảm các ví dụ và giải thích đều đúng.

Ở repo này có thể làm theo vòng ngắn: quyết định hành vi → sửa code → cập nhật OpenAPI và request mẫu → chạy test → đọc lại như người mới dùng. Chẳng hạn thêm `dueDate` thì cần thống nhất kiểu ngày, múi giờ, giá trị mặc định và cách PATCH trước khi chỉ thêm một field vào JSON.

## Giữ tài liệu dùng được khi API thay đổi

Đổi tên/xóa field, đổi kiểu `id`, siết giá trị hợp lệ hoặc đổi status có thể làm client cũ hỏng. Thêm field tùy chọn thường dễ tương thích hơn nhưng client vẫn cần chịu được field chưa biết; thêm giá trị enum cũng có thể làm client xử lý enum cố định bị lỗi.

Nếu phải thay đổi không tương thích, ghi rõ ảnh hưởng, cách chuyển đổi và thời điểm ngừng hỗ trợ phiên bản cũ. Có changelog ngắn đủ hữu ích; không cần biến repo nhỏ thành hệ thống quản lý phiên bản phức tạp.

Trước khi coi tài liệu đã xong, thử tự trả lời: chạy ở URL nào, lấy key ở đâu, gửi một request thành công thế nào, sai dữ liệu trả gì, ID có tồn tại không, dữ liệu có mất khi restart không? Sau đó chạy chính ví dụ vừa viết.

Có thể mở [Swagger Editor](https://editor.swagger.io/) và import `openapi.yaml` để xem cấu trúc. Repo chưa dựng Swagger UI tại server. Nếu dùng giao diện web để gọi `localhost`, còn phụ thuộc chính sách trình duyệt, CORS và quyền truy cập mạng cục bộ; HTTPS gọi HTTP cũng cần xét quy tắc mixed content. Import và kiểm tra tài liệu không yêu cầu bật các quyền đó. Để thử demo, dùng REST Client hoặc Postman desktop.

Đọc thêm: [Swagger UI – CORS](https://swagger.io/docs/open-source-tools/swagger-ui/usage/cors/).
