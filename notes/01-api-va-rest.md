# API và REST API

API là phần giao tiếp mà một chương trình cung cấp cho chương trình khác. Không phải API nào cũng chạy qua mạng: hàm của một thư viện cũng là API. Repo này chỉ thực hành HTTP API.

Ví dụ: ứng dụng ghi chú gửi `GET /api/tasks`, server trả danh sách công việc. Client cần biết cách gọi và dữ liệu trả về, không cần biết server lưu dữ liệu bằng mảng hay database.

## REST hiểu đến đâu trước?

REST là một kiểu kiến trúc, không phải thư viện và cũng không đồng nghĩa với JSON. Một HTTP API có CRUD chưa chắc đáp ứng đầy đủ các ràng buộc của REST. API mẫu ở đây dùng cách đặt resource và HTTP method thường gặp trong REST.

Các ràng buộc chính: tách client/server, stateless, có quy tắc cache, giao diện thống nhất, hệ thống phân lớp; code-on-demand là tùy chọn. Phần giao diện thống nhất còn bao gồm liên kết dẫn tới các thao tác tiếp theo (hypermedia), ngoài phạm vi demo này.

Nguồn: [MDN – REST](https://developer.mozilla.org/en-US/docs/Glossary/REST).

## Thiết kế quanh tài nguyên

`task` là tài nguyên. URL biểu diễn tài nguyên, method biểu diễn thao tác:

```http
GET    /api/tasks       # đọc danh sách
GET    /api/tasks/1     # đọc một việc
POST   /api/tasks       # tạo việc mới
PATCH  /api/tasks/1     # sửa vài trường
DELETE /api/tasks/1     # xóa
```

Dùng `/tasks` thay cho `/getTasks` giúp tên đường dẫn nhất quán. Đây là quy ước thiết kế phổ biến, không phải điều kiện duy nhất quyết định API có RESTful hay không.

`PUT` thường thay thế toàn bộ biểu diễn của tài nguyên ở URL đã biết, `PATCH` áp dụng thay đổi một phần. Demo chỉ có `PATCH`.

## Safe và idempotent

- **Safe:** ý nghĩa của request là đọc, không yêu cầu thay đổi dữ liệu. `GET` thuộc nhóm này; server vẫn có thể ghi access log.
- **Idempotent:** gửi cùng request nhiều lần có tác động dự kiến lên dữ liệu như gửi một lần. Không có nghĩa mọi response phải giống nhau.
- `DELETE /api/tasks/1` lần đầu trả `204`, lần sau có thể trả `404`; tài nguyên vẫn bị xóa nên thao tác vẫn idempotent.
- `POST` tạo mới thường không idempotent: gửi hai lần có thể tạo hai việc.
- `PATCH {"completed": true}` trong demo có thể lặp lại an toàn, nhưng PATCH nói chung không được bảo đảm idempotent. Ví dụ “tăng bộ đếm thêm 1” sẽ khác.

Nguồn: [MDN – HTTP methods](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Methods).

## Stateless không có nghĩa là không lưu dữ liệu

Mỗi request phải mang đủ thông tin cần để xử lý, kể cả thông tin xác thực. Server vẫn lưu task trong database hoặc bộ nhớ; đó là trạng thái của tài nguyên. Ràng buộc stateless nói về việc không phụ thuộc vào ngữ cảnh hội thoại của các request trước.

Trong demo, mỗi lần tạo/sửa/xóa đều gửi lại `x-api-key`. Server không ghi nhớ một lần “đăng nhập” trước đó.

## Cache và danh sách lớn

Response nên cho biết có thể cache thế nào, thường qua `Cache-Control`. Khi bổ sung cache cần tính tới dữ liệu riêng của người dùng và việc dữ liệu bị thay đổi. Demo đặt `Cache-Control: no-store` để mỗi lần thử đều lấy lại dữ liệu.

API thật có nhiều bản ghi thì nên thêm phân trang, giới hạn kích thước và cách sắp xếp rõ ràng. Ví dụ `?page=1&limit=20` hoặc cursor. Repo này chưa làm phân trang; chỉ có bộ lọc `?completed=true` hoặc `false`.

Đọc thêm: [REST constraints – luận án của Roy Fielding](https://ics.uci.edu/~fielding/pubs/dissertation/rest_arch_style.htm), [MDN – HTTP caching](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Caching).
