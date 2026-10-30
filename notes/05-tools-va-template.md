# API tool và template

Một bộ công cụ vừa đủ để học: terminal để gọi nhanh, file `.http` để lưu request, DevTools để xem request từ frontend, test tự động để kiểm tra lại sau khi sửa. Postman tiện khi cần gom request thành collection và chia sẻ với người khác.

Trước khi thử các ví dụ dưới đây, chạy server theo [README](../README.md). Dùng key mẫu `local-practice-key` nếu chưa đổi `.env`. HTTP ở đây chỉ dành cho demo trên máy; dịch vụ thật có credential cần HTTPS.

## cURL: xem được request nhỏ mà không mở giao diện

Trên Windows ghi `curl.exe` để tránh alias `curl` ở một số bản PowerShell.

```powershell
curl.exe -i http://127.0.0.1:3000/health
curl.exe -i 'http://127.0.0.1:3000/api/tasks?completed=false'
curl.exe -i --max-time 5 http://127.0.0.1:3000/api/tasks/1
```

`-i` in cả response headers, `-H` thêm request header, `--max-time` giới hạn thời gian một lần gọi. Dùng `-v` khi cần xem chi tiết kết nối nhưng nhớ đầu ra có thể chứa thông tin xác thực.

Khi body dài, lưu JSON vào file UTF-8, ví dụ `task.json` chứa `{"title":"Ôn lại HTTP"}`. Sau đó:

```powershell
curl.exe -i -H 'Content-Type: application/json' -H 'x-api-key: local-practice-key' --data-binary '@task.json' http://127.0.0.1:3000/api/tasks
```

`--data-binary @file` đọc nội dung file; request này dùng POST do có dữ liệu gửi lên. cURL gửi dữ liệu, không tự xác nhận JSON đúng cú pháp. Không đặt file có secret thật vào Git.

Nguồn: [cURL manual](https://curl.se/docs/manpage.html).

## PowerShell: gửi object thành JSON

`Invoke-RestMethod` tiện hơn khi cần tạo body từ object. `ConvertTo-Json` tạo JSON; byte UTF-8 giúp giữ chữ tiếng Việt nhất quán giữa các bản PowerShell.

```powershell
$headers = @{ 'x-api-key' = 'local-practice-key' }
$body = @{ title = 'Thử tạo công việc'; completed = $false } | ConvertTo-Json
$bytes = [System.Text.Encoding]::UTF8.GetBytes($body)

$created = Invoke-RestMethod -Method Post -Uri 'http://127.0.0.1:3000/api/tasks' -Headers $headers -ContentType 'application/json; charset=utf-8' -Body $bytes
$taskId = $created.data.id

Invoke-RestMethod -Method Patch -Uri "http://127.0.0.1:3000/api/tasks/$taskId" -Headers $headers -ContentType 'application/json' -Body '{"completed":true}'
Invoke-RestMethod -Method Delete -Uri "http://127.0.0.1:3000/api/tasks/$taskId" -Headers $headers
```

`$false` trong object được chuyển thành boolean `false`; đừng dùng chuỗi `'false'`. DELETE thành công có thể không in gì vì response `204` không có body. Nếu cần xem cả status và header, dùng `Invoke-WebRequest` hoặc `curl.exe -i`.

Nguồn: [Microsoft – Invoke-RestMethod](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.utility/invoke-restmethod).

## REST Client: để request cạnh code

Cài [REST Client cho VS Code](https://marketplace.visualstudio.com/items?itemName=humao.rest-client), mở [requests.http](../requests.http) và bấm **Send Request** trên request muốn chạy. `###` chia các request, `@name = value` đặt biến trong file.

Ví dụ dưới đây có thể dùng trong một file `.http` riêng. Gửi `createTask` trước, rồi request PATCH lấy ID từ response của request đó:

```http
@baseUrl = http://localhost:3000
@apiKey = local-practice-key

### Tạo task
# @name createTask
POST {{baseUrl}}/api/tasks
Content-Type: application/json
x-api-key: {{apiKey}}

{"title":"Đọc về request variables"}

### Dùng ID vừa nhận
PATCH {{baseUrl}}/api/tasks/{{createTask.response.body.$.data.id}}
Content-Type: application/json
x-api-key: {{apiKey}}

{"completed":true}
```

Sau khi restart server, response cũ vẫn có thể nằm trong editor nhưng ID đó có thể không còn tồn tại. Gửi lại request tạo rồi mới dùng ID. Nếu đổi port hoặc key, cập nhật biến tương ứng. Dùng biến môi trường hoặc cấu hình cá nhân cho secret thật, không ghi chúng vào file `.http` đã commit.

Nguồn: [REST Client – Variables](https://github.com/Huachao/vscode-restclient#variables).

## Postman: gom thành collection và kiểm tra response

Tạo collection `Tasks API`, tạo environment `Local` có `baseUrl = http://localhost:3000` và `apiKey = local-practice-key`, rồi chọn environment đó. Tạo request với URL `{{baseUrl}}/api/tasks`.

Với POST/PATCH, chọn Body → raw → JSON. Thêm header `x-api-key: {{apiKey}}`; có thể dùng kiểu Authorization **API Key**, key là `x-api-key`, value là `{{apiKey}}`, gửi trong Header. GET công khai có thể để No Auth.

Với POST thành công, thêm script vào **Post-response**:

```javascript
pm.test('Tạo thành công và có Location', () => {
  pm.response.to.have.status(201);
  pm.expect(pm.response.headers.get('Location')).to.match(/^\/api\/tasks\/\d+$/);
});

pm.test('Task có đúng kiểu dữ liệu', () => {
  const task = pm.response.json().data;
  pm.expect(task.id).to.be.a('number');
  pm.expect(task.title).to.be.a('string');
  pm.expect(task.completed).to.be.a('boolean');
  pm.environment.set('taskId', task.id);
});
```

Request tiếp theo có thể dùng `{{baseUrl}}/api/tasks/{{taskId}}`. Tạo một request riêng bỏ key, rồi kiểm tra lỗi:

```javascript
pm.test('Thiếu key bị từ chối', () => {
  pm.response.to.have.status(401);
  pm.expect(pm.response.json().error.message).to.be.a('string');
});
```

Kiểm tra cả giá trị nghiệp vụ, chẳng hạn title đã trim hoặc trạng thái đã đổi, thay vì chỉ nhìn status. Không chạy script parse JSON của POST cho response DELETE `204`.

Collection Runner có thể chạy chuỗi request đã lưu. Repo hiện chỉ kèm `.http`, chưa có collection Postman hoặc Newman. Khi export/chia sẻ collection và environment, kiểm tra để không kèm key thật.

Nguồn: [Postman – Variables](https://learning.postman.com/docs/use/send-requests/variables/environment-variables/), [Postman – Response tests](https://learning.postman.com/docs/tests-and-scripts/write-scripts/test-scripts/).

## Swagger Editor và DevTools dùng vào lúc nào?

**Swagger Editor:** import [openapi.yaml](../openapi.yaml) để đọc endpoint và phát hiện lỗi cấu trúc, field bắt buộc hoặc `$ref` sai. Tài liệu hợp lệ vẫn có thể khác code; cần gọi API để kiểm tra hành vi. Hướng dẫn và lưu ý về gọi localhost nằm ở [chương API document](04-api-document.md).

**Network trong DevTools:** mở trước khi thao tác trên frontend, lọc Fetch/XHR rồi chọn request cần xem. Đọc URL, method, status, request headers, payload và response. Tab Timing giúp tách thời gian chờ/kết nối/nhận dữ liệu; xem Initiator để tìm đoạn code phát request.

Nếu có OPTIONS rồi không có POST/PATCH, kiểm tra response preflight và thông báo Console. `x-api-key` là custom header và JSON không phải content type thuộc nhóm CORS-safelisted; gọi khác origin từ trình duyệt thường cần preflight. Server demo chưa cấu hình CORS cho frontend khác origin. Postman chạy được không chứng minh trình duyệt sẽ cho JavaScript đọc response.

Khi dùng **Copy as cURL**, kiểm tra cookie/token trước khi dán lệnh cho người khác hoặc vào issue công khai.

Nguồn: [Chrome – Network panel](https://developer.chrome.com/docs/devtools/network/), [MDN – CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS).

## Test tự động trong repo

```powershell
npm test
```

[api.test.js](../test/api.test.js) mở server trên một port tạm và gửi HTTP thật bằng `fetch`. Không cần `.env`; test tự cấp key thử và đóng server sau khi chạy. Mỗi test có dữ liệu riêng.

Các nhóm kiểm tra hiện có: đọc/lọc công khai, luồng CRUD và `Location`, thiếu/sai key không đổi dữ liệu, body sai/field lạ/giới hạn title, JSON lỗi/media type/body lớn, ID sai/task không có/route lạ.

Test này chưa kiểm tra trình duyệt, CORS, tải lớn hoặc tính đúng của một hệ thống đăng nhập. File YAML được viết riêng nên test HTTP cũng không tự chứng minh toàn bộ OpenAPI khớp code. Khi thêm tính năng, thêm kiểm tra hành vi có ý nghĩa cùng với tài liệu.

## Mẫu ghi lại endpoint mới

Copy khung này rồi thay phần trống bằng hành vi cụ thể:

````markdown
### Tên thao tác

`METHOD /api/resources/{id}`

- Mục đích:
- Xác thực/quyền cần có:
- Path và query: kiểu, bắt buộc, giá trị mặc định, giới hạn.
- Body: field, kiểu, required, null, field lạ, giới hạn kích thước.

Request:
```http
METHOD /api/resources/1 HTTP/1.1
Host: localhost:3000
```

Thành công: status, headers cần chú ý và body mẫu.
Lỗi: status, điều kiện xảy ra và body mẫu.
Gọi lặp lại: có tạo trùng/thay đổi kết quả không?
Giới hạn: lưu trữ, phân trang, cache, rate limit nếu có.
````

Trước khi code một API mới, chốt tài nguyên và người gọi, xác định quyền, quy tắc dữ liệu, response và lỗi. Với danh sách lớn, thống nhất phân trang/sắp xếp thay vì trả mọi bản ghi. Viết ít nhất một request thành công và vài request sai để thấy hợp đồng có đủ rõ không.

## Khi request không chạy đúng

- **Connection refused / ECONNREFUSED:** kiểm tra process, địa chỉ và port; request có thể chưa tới ứng dụng. Nếu server báo `EADDRINUSE`, port đang có process khác giữ.
- **404:** so lại method/path và ID. Đọc message để phân biệt endpoint không có với task không có; xóa hoặc restart có thể làm ID cũ mất.
- **401:** kiểm tra key đang gửi, `.env` của process và việc đã restart sau khi đổi key. Đừng in key thật vào log để so sánh.
- **415:** kiểm tra `Content-Type`; POST/PATCH demo nhận JSON, không nhận form-urlencoded.
- **400:** đọc message, kiểm tra JSON, kiểu boolean, title rỗng, field lạ và query. Cùng một URL nhưng sai ID định dạng cũng có thể nhận `400`.
- **Lỗi CORS:** xem Console và OPTIONS, origin/header/method được server cho phép. Sửa cấu hình phía server theo nhu cầu thay vì tắt bảo vệ trình duyệt.
- **5xx:** xem log server/proxy với thời điểm và request liên quan. Retry có giới hạn cho lỗi tạm thời và thao tác phù hợp; tự gửi lại POST có thể tạo trùng.

Một cách tập khá nhanh: tạo task → lấy ID → đọc → PATCH → lọc `completed=true` → xóa → đọc lại nhận `404`. Sau đó thử sai key, `completed: "false"`, body `{}` và JSON thiếu dấu ngoặc để xem từng lỗi khác nhau.
