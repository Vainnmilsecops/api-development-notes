# Request – Response

Một lần gọi API có hai phía: client gửi request, server xử lý rồi trả response. Nhìn cả status, header và body sẽ dễ tìm lỗi hơn chỉ nhìn JSON.

## Đọc một request

```http
POST /api/tasks HTTP/1.1
Host: 127.0.0.1:3000
Content-Type: application/json
Accept: application/json
x-api-key: local-practice-key

{"title":"Đọc lại HTTP status codes"}
```

- Method: `POST`.
- Path: `/api/tasks`.
- Headers: thông tin về nội dung và xác thực.
- Body: dữ liệu gửi lên. Dòng trống phân cách header và body.

`Content-Type` mô tả body đang gửi. `Accept` cho biết client muốn nhận định dạng nào; server chỉ hỗ trợ những định dạng đã công bố. API mẫu chỉ trả JSON.

Với `GET /api/tasks/1`, `1` là path parameter. Với `GET /api/tasks?completed=false`, `completed` là query parameter dùng để lọc danh sách.

Trong Express: `req.params` lấy path parameter, `req.query` lấy query string, `req.body` lấy body sau khi qua middleware parse JSON. Dữ liệu từ client đều cần kiểm tra kiểu và giá trị.

Nguồn: [MDN – Overview of HTTP](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Overview), [Express – Request](https://expressjs.com/en/5x/api/request/).

## Đọc response

```http
HTTP/1.1 201 Created
Content-Type: application/json; charset=utf-8
Location: /api/tasks/3

{"data":{"id":3,"title":"Đọc lại HTTP status codes","completed":false}}
```

`201` báo tạo thành công. `Location` trỏ tới tài nguyên vừa tạo. ID trong ví dụ là minh họa; hãy lấy ID thực từ response.

Các mã thường dùng:

- `200 OK`: đọc hoặc cập nhật thành công.
- `201 Created`: tạo tài nguyên thành công.
- `204 No Content`: thành công và không có response body.
- `400 Bad Request`: request không hợp lệ, ví dụ title rỗng.
- `401 Unauthorized`: thiếu hoặc sai thông tin xác thực.
- `403 Forbidden`: server từ chối quyền truy cập; thường dùng khi đã xác thực nhưng thiếu quyền.
- `404 Not Found`: route hoặc tài nguyên không tồn tại.
- `415 Unsupported Media Type`: kiểu nội dung request không được hỗ trợ.
- `429 Too Many Requests`: vượt giới hạn gọi API.
- `500 Internal Server Error`: lỗi phía server.

`403` và `429` để biết khi đọc API khác; demo chưa có phân quyền hay rate limit. Không nên trả `200` cho mọi lỗi rồi bắt client tự đoán từ nội dung.

Nguồn: [MDN – HTTP response status codes](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status).

## Chỗ dễ vướng

JSON dùng dấu nháy kép và không có dấu phẩy thừa. `false` khác `"false"`: cái trước là boolean, cái sau là chuỗi. Query string truyền văn bản, nên server phải diễn giải `?completed=false` trước khi lọc.

Không dùng `GET` để tạo/xóa dữ liệu. Tránh gửi body cho GET vì ý nghĩa và khả năng hỗ trợ không thống nhất giữa các công cụ. Bộ lọc đơn giản đặt trong query string.

CORS là cơ chế trình duyệt kiểm soát việc JavaScript đọc response từ origin khác. Postman gọi được mà frontend bị CORS không có nghĩa endpoint bị hỏng. CORS không thay cho xác thực; demo chưa cấu hình cho frontend chạy khác origin.

Thử bỏ header `x-api-key`, gửi `{"title":" "}`, rồi đổi `completed` thành chuỗi để quan sát các lỗi khác nhau trong [requests.http](../requests.http).

Đọc thêm: [MDN – CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS).
