# Request – Response

## Một lần gọi API đi qua đâu?

Client chuẩn bị URL, method, header, body → tìm địa chỉ server qua DNS nếu cần → thiết lập hoặc dùng lại kết nối → gửi request → server xử lý → nhận status, header, body. Với HTTPS có thêm lớp TLS; HTTP/3 dùng QUIC nên chi tiết kết nối khác HTTP/1.1 và HTTP/2.

Đây là luồng tổng quát, không có nghĩa mỗi request đều làm lại DNS và tạo kết nối mới. Trình duyệt hoặc HTTP client có thể dùng connection pool và cache. Tham khảo [MDN – Overview of HTTP](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Overview).

Ở Express, thứ tự middleware ảnh hưởng kết quả. Luồng POST trong demo là:

```text
Cache-Control:no-store → kiểm tra API key → kiểm tra Content-Type
→ parse JSON → kiểm tra body → tạo task → trả 201
```

Middleware có thể trả response sớm, ví dụ sai key thì nhận `401` trước khi body được parse. Lỗi parse được chuyển đến error middleware. Vì thế cùng một request có nhiều lỗi, server thường chỉ báo lỗi gặp trước.

Nguồn: [Express – Using middleware](https://expressjs.com/en/guide/using-middleware/). Đọc [src/app.js](../src/app.js) để thấy đúng thứ tự của demo.

## URL, path, query và fragment

Với `https://api.example.com:443/api/tasks/12?completed=false#detail`:

- `https` là scheme; `api.example.com` là host; `443` là port.
- `/api/tasks/12` là path; `12` có thể được router khai báo làm path parameter.
- `completed=false` là query string; giá trị cần được parse theo hợp đồng API.
- `#detail` là fragment phía client, không được gửi trong HTTP request tới server.

Trong demo, dùng `GET /api/tasks/1` để lấy một task; dùng `GET /api/tasks?completed=false` để lọc danh sách. Không chuyển bộ lọc sang route chi tiết rồi mong server hiểu cùng ý nghĩa.

Văn bản có khoảng trắng/ký tự đặc biệt cần URL encoding. Nên dùng `URLSearchParams` thay vì tự nối chuỗi. Tránh để password/token trong URL vì URL dễ xuất hiện trong log, lịch sử và công cụ theo dõi.

## Đọc nguyên một cặp request/response

Đây là ví dụ HTTP/1.1 dạng văn bản, lược bớt header như Date và Connection. HTTP/2, HTTP/3 truyền theo framing khác nhưng vẫn giữ các khái niệm method, status, header và content.

```http
POST /api/tasks HTTP/1.1
Host: 127.0.0.1:3000
Content-Type: application/json
Accept: application/json
x-api-key: local-practice-key
Content-Length: 37

{"title":"Thu API","completed":false}
```

```http
HTTP/1.1 201 Created
Content-Type: application/json; charset=utf-8
Cache-Control: no-store
Location: /api/tasks/3
Content-Length: 53

{"data":{"id":3,"title":"Thu API","completed":false}}
```

Dòng đầu cho biết method/target hoặc status. Header là metadata. Dòng trống phân cách header với body. `Content-Length` tính theo byte, không phải số chữ hiển thị; thông thường HTTP client tự tính nên không cần tự nhập khi dùng REST Client/Postman.

`201` xác nhận đã tạo, `Location` chỉ URI của task mới. ID `3` chỉ là ví dụ; lấy ID thật từ response. `204 No Content` của DELETE sẽ không có body để parse JSON.

Nguồn: [MDN – HTTP messages](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Messages), [RFC 9110 – HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110.html).

## Content-Type, Accept và định dạng body

`Content-Type` cho biết nội dung đang gửi là gì. `Accept` nêu định dạng response client chấp nhận. Ví dụ gửi JSON nhưng muốn nhận XML là hai yêu cầu riêng; không phải server nào cũng hỗ trợ cả hai.

API có content negotiation cần chọn kiểu được hỗ trợ; có thể trả `406` nếu không tạo được định dạng chấp nhận. Demo chỉ có JSON và không triển khai đầy đủ việc thương lượng `Accept`.

`Content-Encoding` như gzip lại mô tả nén nội dung, không thay cho media type. Header name không phân biệt hoa thường; đừng suy rộng điều đó thành mọi giá trị header đều không phân biệt hoa thường.

Nguồn: [MDN – Content negotiation](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Content_negotiation).

### JSON và kiểu dữ liệu

JSON có object, array, string, number, boolean và `null`. Không có `undefined`, comment hoặc dấu phẩy thừa. Tên field và chuỗi dùng dấu nháy kép. Ngày giờ thường được biểu diễn bằng chuỗi theo định dạng đã công bố.

```json
{"title":"Đọc tài liệu","completed":false}
```

`false` khác `"false"`, `12` khác `"12"`, field bị bỏ qua khác field có giá trị `null`. Trong PATCH của demo, bỏ `title` nghĩa là giữ nguyên; gửi `title: null` là lỗi. Query `?completed=false` truyền văn bản, nên không được dùng `Boolean("false")` để chuyển kiểu vì kết quả là `true`.

JSON trao đổi giữa các hệ thống dùng UTF-8. Với ID lớn hơn giới hạn số nguyên an toàn của JavaScript, có thể cần dùng chuỗi thay vì number để tránh mất chính xác. Demo chỉ dùng ID số nhỏ.

Nguồn: [MDN – JSON](https://developer.mozilla.org/en-US/docs/Glossary/JSON), [RFC 8259 – JSON](https://www.rfc-editor.org/rfc/rfc8259.html).

### Form và file upload

`application/x-www-form-urlencoded` biểu diễn cặp key/value, phù hợp form đơn giản. `multipart/form-data` chia body thành các phần, dùng được cho field và file. Nếu dùng `FormData` trong trình duyệt, để trình duyệt tự tạo `Content-Type` có boundary.

Parse JSON không tự đọc được mọi loại body. Express cần middleware phù hợp với từng loại; upload còn cần giới hạn kích thước và kiểm tra file. POST/PATCH trong demo chỉ nhận `application/json`, gửi form sẽ nhận `415`.

Nguồn: [MDN – POST và các kiểu form body](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Methods/POST).

## Đọc status theo nhóm

`1xx` là thông tin tạm thời; `2xx` là xử lý thành công; `3xx` liên quan chuyển hướng/cache; `4xx` là vấn đề request hoặc quyền truy cập; `5xx` là server không thực hiện được request. Status cần đọc cùng body và header, không chỉ dựa vào tên.

**Luồng thành công:** `200` trả kết quả; `201` tạo tài nguyên; `204` thành công không body. `202 Accepted` mới xác nhận đã nhận việc, chưa bảo đảm hoàn thành. Ví dụ xuất báo cáo nền có thể trả `202` kèm URL xem tiến độ, rồi client hỏi lại.

Nguồn: [MDN – Status codes](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status), [MDN – 202](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status/202).

**Chuyển hướng:** `301/308` là chuyển vĩnh viễn, `302/307` là chuyển tạm thời. Với POST, `301/302` có thể bị client chuyển thành GET; `307/308` giữ method và body. `304` là phản hồi cho cache validation, dùng lại bản đã lưu và không có response body; không phải redirect tới một URL mới.

Nguồn: [MDN – Redirections](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Redirections).

**Request không hợp lệ:** `400` dùng cho lỗi request nói chung; `413` là nội dung quá lớn; `415` là kiểu nội dung/encoding không hỗ trợ. `422` có thể dùng khi nội dung đọc được nhưng không xử lý được về ý nghĩa. Cần chọn quy ước validation nhất quán; demo dùng `400` cho cả JSON lỗi và field sai.

**Xác thực và định tuyến:** `401` là chưa có thông tin xác thực hợp lệ; `403` là server từ chối cho phép; `404` là không tìm thấy hoặc không công bố resource. `405` là method không được phép cho resource, thường kèm `Allow`. Demo dùng fallback `404` cho route/method không khớp, chưa xử lý `405` riêng.

**Xung đột và giới hạn:** `409` phù hợp xung đột với trạng thái hiện tại, ví dụ thao tác không còn hợp lệ sau một thay đổi khác. `429` báo gọi quá giới hạn, có thể kèm `Retry-After`. Đừng tự retry liên tục mọi lỗi 4xx.

Đọc riêng: [422](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status/422), [409](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status/409), [429](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status/429).

**Lỗi phía dịch vụ:** `500` là lỗi không mong đợi ở server. `502` là gateway nhận phản hồi không hợp lệ từ upstream; `503` là dịch vụ tạm không sẵn sàng; `504` là gateway chờ upstream quá lâu. Nếu có reverse proxy, một request chưa tới code Express vẫn có thể nhận 502/504.

Nguồn: [MDN – 502](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status/502), [503](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status/503), [504](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status/504).

## Parse được chưa chắc dữ liệu đã hợp lệ

Trong Express, `req.params` chứa path parameter; `req.query` là query đã parse; `req.body` phụ thuộc middleware parse body. Chúng đều là dữ liệu bên ngoài, không được coi là đúng kiểu chỉ vì đã đọc được. Nguồn: [Express – Request](https://expressjs.com/en/5x/api/request/).

Kiểm tra theo nhiều lớp: kiểu nội dung → cú pháp JSON → schema/kiểu field → giới hạn giá trị → quy tắc nghiệp vụ → quyền trên tài nguyên. Ví dụ số lượng mua là number dương vẫn cần kiểm tra tồn kho ở thời điểm xử lý.

Contract cụ thể của demo:

- Body phải là JSON object; không nhận array/null hoặc field ngoài `title`, `completed`.
- POST cần `title`, trim hai đầu rồi kiểm tra dài từ 1 đến 120 theo `String.length` của JavaScript; `completed` tùy chọn, mặc định `false`.
- PATCH phải có ít nhất một field; `completed` phải là boolean khi có gửi.
- ID phải là số nguyên dương an toàn; ID đúng dạng nhưng không tồn tại trả `404`.
- Body JSON giới hạn 10 KB; vượt giới hạn trả `413`.

Lỗi có một dạng chung, ví dụ:

```json
{"error":{"message":"completed phải là true hoặc false, không phải chuỗi."}}
```

Ứng dụng lớn hơn có thể thêm mã lỗi ổn định và lỗi theo field để client xử lý. Đó là ý tưởng mở rộng, không phải field sẵn có của demo. Không trả stack trace, SQL hay secret trong lỗi gửi về client.

## CORS: vì sao Postman chạy còn trình duyệt bị chặn?

Origin gồm scheme, host và port. `http://localhost:5173` khác `http://localhost:3000`. Server công bố chính sách bằng CORS header; trình duyệt thực thi khi JavaScript truy cập khác origin.

Gửi JSON hoặc custom header `x-api-key` thường cần preflight:

```http
OPTIONS /api/tasks HTTP/1.1
Origin: http://localhost:5173
Access-Control-Request-Method: POST
Access-Control-Request-Headers: content-type,x-api-key
```

Server cần cho phép origin, method, header phù hợp trước khi trình duyệt gửi request thật. Một số request đơn giản không preflight nhưng vẫn cần response có CORS header để JavaScript đọc được.

Nếu dùng cookie khác origin, client cần cấu hình credentials phù hợp; server cần `Access-Control-Allow-Credentials: true` và origin cụ thể, không dùng `*`. Chính sách cookie/SameSite vẫn áp dụng.

CORS không xác thực người gọi và không ngăn mọi request ngoài trình duyệt. Server vẫn phải kiểm tra quyền. Demo chưa cấu hình CORS cho frontend khác origin; OPTIONS do framework trả không tự tạo đủ chính sách CORS.

Nguồn: [MDN – CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS).

## HTTPS, timeout và retry

HTTPS bảo vệ dữ liệu khi truyền và giúp xác thực server qua TLS/certificate. Nó không thay kiểm tra input/quyền, cũng không che secret đã ghi vào log. HTTP local trong demo phục vụ việc học; khi gọi qua mạng cần HTTPS. Nguồn: [MDN – HTTPS](https://developer.mozilla.org/en-US/docs/Glossary/HTTPS).

Đặt timeout phù hợp để client không chờ mãi. Timeout không chứng minh server chưa xử lý; hủy request phía client cũng không tự hoàn tác một thay đổi đã ghi.

Chỉ retry lỗi có thể tạm thời, cân nhắc tính idempotent và hợp đồng API. Giới hạn số lần/tổng thời gian; tăng khoảng nghỉ như 200 ms → 400 ms → 800 ms, có trần và jitter ngẫu nhiên. Tôn trọng `Retry-After` nếu có. Nhiều tầng cùng retry có thể nhân số request và khiến server quá tải.

Không tự retry POST tạo task chỉ vì timeout; xem phần idempotency ở [chương REST](01-api-va-rest.md). Demo chưa triển khai retry tự động hoặc idempotency key.

Nguồn: [AWS – Timeouts, retries and backoff with jitter](https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/).

### Fetch không tự throw khi HTTP trả 400/500

`fetch()` thường reject khi có lỗi mạng, bị abort hoặc request không thực hiện được. Nhận response `404/500` vẫn có thể resolve, nên cần kiểm tra `response.ok` hoặc `status` trước khi coi là thành công.

```js
const response = await fetch('http://127.0.0.1:3000/api/tasks');
if (!response.ok) throw new Error(`HTTP ${response.status}`);
const result = response.status === 204 ? null : await response.json();
```

`.json()` cũng có thể lỗi nếu body rỗng hoặc không phải JSON. Với API bên ngoài, kiểm tra `Content-Type` và hợp đồng response; đừng mặc định proxy/server lỗi cũng luôn trả JSON. Nguồn: [MDN – Using Fetch](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch).

## Khi debug, kiểm tra theo thứ tự

1. Server có chạy đúng host/port không? Nếu chưa nhận HTTP response thì xem DNS, kết nối, TLS hoặc process trước.
2. Method và path có đúng không? Có đang gửi nhầm URL frontend hoặc thiếu `/api` không?
3. Xem status, response header và body thật trong REST Client hoặc tab Network; tránh chỉ nhìn thông báo do frontend tự viết.
4. Kiểm tra `Content-Type`, key và kiểu field; phân biệt `false` với `"false"`. Lỗi CORS thì xem cả OPTIONS/preflight.
5. So sánh với request tối thiểu chạy được. Xem log server cùng thời điểm nhưng không in API key ra log.

Thử trong [requests.http](../requests.http): sai key → `401`; JSON lỗi/title rỗng → `400`; gửi form → `415`; task không có → `404`; xóa thành công → `204`. Mỗi lần restart dữ liệu về ban đầu vì demo chỉ lưu trong bộ nhớ.
