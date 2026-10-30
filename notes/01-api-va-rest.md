# API và REST API

## API là gì, Web API là gì?

API là giao diện để phần mềm sử dụng chức năng của phần mềm khác. `JSON.parse()` là API của JavaScript; hàm đọc file là API của môi trường chạy. Chúng không nhất thiết liên quan đến mạng.

Web API cho phép client gọi một dịch vụ qua giao thức web, thường là HTTP. Client có thể là trình duyệt, mobile app, một backend khác hoặc script. Endpoint là điểm truy cập cho một thao tác, chẳng hạn `GET /api/tasks/1`.

Hợp đồng API gồm cách gửi request, dữ liệu hợp lệ, cách xác thực và response. Khi hợp đồng ổn định, server có thể đổi cách lưu dữ liệu mà client không cần sửa.

Trong repo này, client chỉ cần biết gọi `/api/tasks` và đọc các trường `id`, `title`, `completed`; không cần biết server đang lưu một mảng trong bộ nhớ.

## REST đứng ở đâu giữa các cách làm API?

- **REST** là kiểu kiến trúc dựa trên tài nguyên và một tập ràng buộc. Với HTTP, thường dùng URI để nhận diện tài nguyên, method để thể hiện ý nghĩa thao tác.
- **RPC** nhìn theo hành động/hàm cần gọi, ví dụ `completeTask(taskId)`. gRPC là một hệ sinh thái RPC có hợp đồng service; RPC không đồng nghĩa với gRPC.
- **GraphQL** có schema kiểu dữ liệu và ngôn ngữ truy vấn; client chọn các trường cần lấy. Phân quyền, giới hạn truy vấn và tối ưu truy cập dữ liệu vẫn là việc phải thiết kế.
- **SOAP** là framework trao đổi thông điệp dùng XML, có cấu trúc Envelope và quy tắc xử lý. Nó không đơn giản là “REST nhưng đổi JSON thành XML”.

Không có lựa chọn tốt nhất cho mọi bài toán. API công khai quanh resource thường dễ trình bày theo REST; RPC hợp với các thao tác nghiệp vụ rõ; GraphQL hữu ích khi client cần nhiều tổ hợp dữ liệu. Đây là định hướng, không phải quy tắc bắt buộc.

Nguồn: [MDN – REST](https://developer.mozilla.org/en-US/docs/Glossary/REST), [gRPC introduction](https://grpc.io/docs/what-is-grpc/introduction/), [GraphQL](https://graphql.org/learn/), [W3C – SOAP](https://www.w3.org/TR/soap12-part1/).

## Tài nguyên, biểu diễn và URI

Tài nguyên là thứ API quản lý: task, user, đơn hàng, hoặc một lần xuất báo cáo. Tài nguyên không nhất thiết tương ứng một bảng database. JSON trả về là một **biểu diễn** của tài nguyên, không phải bản thân tài nguyên.

Một số quy ước dễ giữ nhất quán:

```http
GET    /api/tasks          # collection: danh sách task
POST   /api/tasks          # tạo một task
GET    /api/tasks/12       # một task cụ thể
PATCH  /api/tasks/12       # cập nhật một phần
DELETE /api/tasks/12       # xóa task
```

Dùng danh từ số nhiều như `/tasks` là quy ước phổ biến. `/getTasks` vẫn có thể gọi được, nhưng đã đưa ý nghĩa của method vào tên path. Chọn một cách đặt tên và dùng xuyên suốt thường hữu ích hơn tranh luận số ít hay số nhiều.

Nested path thể hiện quan hệ, ví dụ `/projects/7/tasks`. Không nên lồng dài như `/users/1/teams/2/projects/7/tasks/12` nếu chỉ cần `/tasks/12` để nhận diện task. Path dài làm client phụ thuộc nhiều vào cấu trúc quan hệ.

Một thao tác nghiệp vụ có thể mô hình hóa thành resource, ví dụ `POST /orders/7/cancellations`. Nếu dùng custom action như `/orders/7:cancel`, cần ghi rõ đây là quy ước của API, không ép mọi hành động thành CRUD thiếu tự nhiên.

Các ví dụ project/order ở trên chỉ minh họa thiết kế; demo không có những endpoint này. Tham khảo cách phân tách resource và method trong [Google AIP-121](https://google.aip.dev/121).

## REST và RESTful: cần đúng những gì?

“RESTful” thường được dùng để nói API theo REST, nhưng thực tế nhiều API chỉ dùng HTTP + JSON + CRUD. Có đủ các endpoint CRUD không tự chứng minh API đáp ứng REST.

Sáu ràng buộc trong mô hình REST:

1. **Client–server:** tách phần giao diện với xử lý/lưu dữ liệu để hai phía phát triển độc lập.
2. **Stateless:** request mang đủ thông tin xử lý; server không cần nhớ ngữ cảnh hội thoại từ request trước.
3. **Cache:** response cho biết có được tái sử dụng từ cache hay không.
4. **Uniform interface:** giao diện thống nhất để các thành phần hiểu cách tương tác với resource.
5. **Layered system:** client không phải biết đang giao tiếp trực tiếp với origin server hay qua tầng trung gian.
6. **Code on demand:** server có thể gửi mã để client thực thi; ràng buộc này là tùy chọn.

Uniform interface gồm nhận diện resource, thao tác qua biểu diễn, thông điệp tự mô tả và hypermedia dẫn dắt bước tương tác tiếp theo. Ví dụ response của đơn hàng có thể chứa liên kết hủy nếu trạng thái hiện tại cho phép hủy. Chỉ thêm một mảng `links` chưa đủ để chứng minh toàn bộ thiết kế đạt REST.

Nguồn gốc: [Roy Fielding – REST architectural style](https://ics.uci.edu/~fielding/pubs/dissertation/rest_arch_style.htm).

### Stateless vẫn lưu được task

Task đã tạo, số dư tài khoản hay đơn hàng là **resource state**, server vẫn lưu chúng bình thường. Stateless nói về việc xử lý request không dựa vào session hội thoại được giữ từ trước.

Ví dụ POST của demo tự mang API key và body. Server không yêu cầu client phải gọi một endpoint “chọn task hiện tại” trước rồi mới hiểu PATCH tiếp theo. Database không làm API mất tính stateless; lưu ngữ cảnh hội thoại trên server mới là điểm cần xét.

## Chọn HTTP method theo ý nghĩa

- **GET:** lấy biểu diễn. Không dùng để tạo/xóa dữ liệu; crawler hay trình duyệt có thể gọi trước mà người dùng chưa bấm nút.
- **POST:** yêu cầu resource xử lý nội dung gửi lên; tạo mới là một trường hợp phổ biến, không phải ý nghĩa duy nhất.
- **PUT:** tạo hoặc thay thế biểu diễn ở URI đã biết theo hợp đồng API. Trường bị bỏ khỏi body thường không có nghĩa “giữ nguyên” như PATCH.
- **PATCH:** áp dụng thay đổi một phần. Định dạng patch và ý nghĩa field thiếu/null phải được công bố.
- **DELETE:** yêu cầu gỡ liên kết của resource ở URI đó. Không bảo đảm hệ thống đã xóa vật lý mọi bản sao/log ngay lập tức.
- **HEAD:** gần như GET nhưng không trả response body; hữu ích để xem metadata. Một số header có thể được lược bỏ nếu chỉ tính được khi tạo body.
- **OPTIONS:** hỏi các lựa chọn giao tiếp. Trình duyệt còn dùng OPTIONS trong CORS preflight.

Demo triển khai GET/POST/PATCH/DELETE. Express có thể tự xử lý HEAD cho route GET và OPTIONS theo route; repo không có nghiệp vụ riêng cho hai method đó, cũng không có endpoint PUT.

Nguồn: [MDN – HTTP methods](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Methods), [RFC 5789 – PATCH](https://www.rfc-editor.org/rfc/rfc5789.html).

### Safe và idempotent là hai ý khác nhau

**Safe** nói thao tác không yêu cầu thay đổi trạng thái nghiệp vụ; server vẫn được ghi log. GET, HEAD và OPTIONS là safe. Gọi GET mà tự trừ tiền là thiết kế sai với ý nghĩa method.

**Idempotent** nói gửi nhiều request giống nhau có tác động dự kiến như gửi một lần. GET, HEAD, OPTIONS, PUT và DELETE thuộc nhóm này. Response không cần giống nhau: DELETE lần đầu `204`, lần sau `404` vẫn có thể idempotent.

POST và PATCH không được bảo đảm idempotent theo method. `PATCH {"completed":true}` của demo là phép gán nên lặp lại không đổi kết quả cuối; một PATCH mang nghĩa “tăng thêm 1” lại khác.

Tham khảo riêng hai khái niệm: [MDN – Safe](https://developer.mozilla.org/en-US/docs/Glossary/Safe/HTTP), [MDN – Idempotent](https://developer.mozilla.org/en-US/docs/Glossary/Idempotent).

### Vì sao retry POST có thể tạo dữ liệu trùng?

Client gửi POST tạo task → server đã tạo xong → mạng đứt trước khi response tới client. Client chỉ biết timeout, không biết thao tác đã thành công hay chưa. Gửi lại nguyên POST có thể tạo task thứ hai.

Một cách xử lý là **idempotency key**: client gắn mã duy nhất cho một ý định tạo; server lưu kết quả và trả lại khi nhận lại cùng mã. Mã cho lần retry phải giữ nguyên, không sinh mã mới mỗi lần gửi. Server cần quy định thời hạn, phạm vi key, xử lý request đồng thời và trường hợp cùng key nhưng body khác.

Header tên `Idempotency-Key` chỉ có tác dụng khi server thực sự triển khai cơ chế tương ứng. Demo chưa có cơ chế này; thêm header tùy ý sẽ không ngăn việc tạo trùng.

Đọc ví dụ thiết kế: [AWS – Making retries safe with idempotent APIs](https://aws.amazon.com/builders-library/making-retries-safe-with-idempotent-APIs/).

## Danh sách: lọc, sắp xếp, phân trang

Query parameter mô tả cách đọc collection, không nên biến mỗi bộ lọc thành một path mới. Ví dụ thiết kế cho hệ thống lớn hơn:

```http
GET /api/tasks?completed=false&sort=createdAt&order=desc&limit=20&offset=40
```

- **Filtering:** chọn bản ghi thỏa điều kiện. Cần ghi rõ giá trị hợp lệ và cách kết hợp các bộ lọc.
- **Sorting:** quy định trường được sắp xếp và chiều tăng/giảm; dùng thêm ID làm điều kiện phụ để thứ tự ổn định.
- **Offset/page:** dễ nhảy trang, nhưng dữ liệu chèn/xóa giữa hai lần đọc có thể làm lặp hoặc bỏ sót bản ghi. Offset lớn cũng có thể tốn công truy vấn.
- **Cursor:** trả token cho vị trí đọc tiếp, ví dụ `?cursor=...&limit=20`. Thích hợp đọc tuần tự; không mặc định cho phép nhảy tới một số trang bất kỳ.

Cursor nên là token mà client coi như opaque, không tự bóc tách hay sửa. Token không thay thế xác thực. Cursor dựa trên thứ tự ổn định giúp tránh một số vấn đề offset, nhưng không tự bảo đảm snapshot nhất quán khi dữ liệu tiếp tục thay đổi.

Luôn giới hạn `limit` tối đa và ghi rõ lúc hết dữ liệu. Có cần trả tổng số bản ghi không là một quyết định riêng vì việc đếm có thể đắt.

Demo hiện chỉ hỗ trợ `GET /api/tasks?completed=true` hoặc `false`, chưa có sort, limit, offset, cursor hay metadata phân trang. Mẫu query nhiều trường bên trên chưa chạy được như một tính năng của repo.

Tham khảo thiết kế token và kích thước trang: [Google AIP-158](https://google.aip.dev/158).

## Versioning và tương thích ngược

Có thể đưa major version vào path như `/api/v1/tasks`, hoặc dùng header/media type. Quan trọng là công bố một cách và có kế hoạch chuyển đổi. Version API không phải phiên bản HTTP, cũng không phải phiên bản OpenAPI dùng để viết tài liệu.

Các thay đổi dễ làm client hỏng: đổi tên/xóa field, đổi kiểu `id` từ số sang chuỗi, biến field tùy chọn thành bắt buộc, đổi ý nghĩa mặc định hoặc đổi định dạng lỗi. Thêm field response thường ít rủi ro hơn, nhưng client kiểm tra schema quá chặt vẫn có thể bị ảnh hưởng.

Thêm giá trị enum cũng cần xem client có xử lý giá trị chưa biết không. Không nên cho rằng chỉ thêm mới thì luôn tương thích. Với thay đổi lớn, duy trì thời gian chuyển tiếp, ghi changelog và thông báo ngừng hỗ trợ phiên bản cũ.

Demo chưa có version trong URL. Nếu thêm version sau này, hãy sửa đồng bộ code, OpenAPI và request mẫu.

Đọc thêm: [Google AIP-180 – Backwards compatibility](https://google.aip.dev/180).

## Cache: lưu lại và kiểm tra lại là hai việc

`Cache-Control` quy định cách cache dùng response:

- `max-age=60`: cho phép coi response là còn mới trong 60 giây theo quy tắc cache.
- `private`: dành cho cache riêng của người dùng, không cho shared cache lưu.
- `no-cache`: có thể lưu, nhưng phải xác thực lại với server trước khi tái sử dụng.
- `no-store`: không được lưu response vào cache. Không có nghĩa mọi bản cũ đã được cache trước đó tự bị xóa.

Không suy ra rằng endpoint dùng GET thì mọi dữ liệu đều có thể cache công khai. Đặc biệt phải xem dữ liệu riêng tư, thông tin xác thực và các header ảnh hưởng tới nội dung.

Nguồn: [MDN – Cache-Control](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cache-Control).

### ETag, If-None-Match và 304

Một ví dụ cho API có cache validation:

```http
GET /api/tasks/12
```

Server trả `200`, body và `ETag: "task-12-v4"`. Client đã lưu bản này, lần sau gửi:

```http
GET /api/tasks/12
If-None-Match: "task-12-v4"
```

Nếu biểu diễn chưa đổi, server có thể trả `304 Not Modified` không kèm body; client dùng lại body đã lưu. Nếu đã đổi, server trả `200` với biểu diễn mới. ETag là mã phiên bản do server cung cấp, client không nên tự đoán cách tạo.

`If-Match` còn có thể dùng khi cập nhật để tránh ghi đè thay đổi của người khác: phiên bản không khớp thì server từ chối với `412 Precondition Failed`. Việc này khác dùng API key để kiểm tra quyền gọi.

Nguồn: [MDN – ETag](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/ETag), [MDN – If-None-Match](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/If-None-Match).

Demo đặt `Cache-Control: no-store` và không tự viết chiến lược cache. Express vẫn có thể tự sinh ETag và trả `304` khi nhận conditional GET phù hợp; điều này không hủy chỉ thị không lưu response. Demo chưa kiểm tra `If-Match` để chống ghi đè.

## Tự kiểm tra lại

1. Vì sao lưu task trong database vẫn có thể stateless?
2. Vì sao DELETE trả status khác ở lần hai vẫn có thể idempotent?
3. Client timeout sau POST có chắc task chưa được tạo không?
4. `no-cache` khác `no-store` ở điểm nào?
5. Khi thêm enum mới, client cũ có thể hỏng ra sao?

Đối chiếu các ví dụ chạy được trong [requests.http](../requests.http), rồi đọc tiếp [Request – Response](02-request-response.md).
