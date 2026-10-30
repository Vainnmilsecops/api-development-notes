# API authentication

Authentication kiểm tra danh tính/thông tin xác thực của bên gọi. Authorization quyết định bên đó được phép làm gì. Ví dụ: biết người dùng là ai chưa đủ để cho họ xóa task của người khác.

## API key đang dùng trong repo

API key là một secret được cấp cho bên gọi. Demo kiểm tra key trong header:

```http
PATCH /api/tasks/1
x-api-key: local-practice-key
Content-Type: application/json

{"completed":true}
```

- `GET /health`, `GET /api/tasks`, `GET /api/tasks/:id`: công khai.
- `POST`, `PATCH`, `DELETE` của task: cần key trùng `API_KEY` trong môi trường server.
- Thiếu hoặc sai key: `401`, body có dạng `{"error":{"message":"..."}}`.

Đây là một key dùng chung để học middleware xác thực. Nó không tạo tài khoản, không nhận diện từng người dùng, không có quyền sở hữu task. Key trong `.env.example` là giá trị dùng thử; `.env` thật không đưa vào Git.

Không nhét secret vào query string vì URL dễ xuất hiện trong log và lịch sử. Khi triển khai qua mạng cần HTTPS; key bí mật cũng không thể giấu bằng cách đưa nó vào mã frontend gửi xuống trình duyệt.

## Các cách khác thường gặp

**Basic authentication** gửi `username:password` dưới dạng Base64 trong header `Authorization`. Base64 là encoding, không phải mã hóa bảo mật. Chỉ dùng qua HTTPS và tránh log thông tin này.

**Bearer token** thường được gửi như sau:

```http
Authorization: Bearer <access-token>
```

Ai giữ token có thể sử dụng quyền mà token cấp. “Bearer” mô tả cách sử dụng token; token có thể là chuỗi opaque hoặc JWT, không mặc định là JWT.

Nguồn: [MDN – HTTP authentication](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Authentication), [RFC 6750 – Bearer token](https://www.rfc-editor.org/rfc/rfc6750.html).

**JWT** là định dạng chứa claims. JWT có chữ ký thường thấy gồm `header.payload.signature`; payload đọc được, chữ ký không che nội dung. JWT cũng có dạng mã hóa, nhưng không nên nghĩ “cứ JWT là dữ liệu đã được giấu”.

Khi xác thực JWT cần kiểm tra chữ ký bằng thuật toán được cho phép, thời hạn và issuer/audience phù hợp. Chỉ decode payload không có nghĩa token hợp lệ. Không đặt password vào payload. Repo này không triển khai JWT.

Nguồn: [RFC 7519 – JWT](https://www.rfc-editor.org/rfc/rfc7519.html).

**Session cookie**: server lưu phiên, trình duyệt gửi cookie chứa mã phiên. Cần nghĩ tới thuộc tính `HttpOnly`, `Secure`, `SameSite` và phòng CSRF theo cách ứng dụng dùng cookie. Cách này khác API key dùng chung của demo.

**OAuth 2.0** là framework cấp quyền truy cập, ví dụ cho một ứng dụng quyền đọc dữ liệu ở dịch vụ khác. Nó không tự định nghĩa giao thức đăng nhập người dùng. OpenID Connect bổ sung lớp xác thực trên OAuth 2.0 cho nhu cầu đăng nhập.

Nguồn: [RFC 6749 – OAuth 2.0](https://www.rfc-editor.org/rfc/rfc6749.html), [OpenID Connect Core](https://openid.net/specs/openid-connect-core-1_0.html).

## Thử rồi nhìn kết quả

1. Gọi GET mà không có key: vẫn đọc được.
2. Gọi POST mà không có key: nhận `401`.
3. Thêm key đúng: tạo được task, nhận `201`.
4. Đổi `API_KEY` trong `.env`, khởi động lại server rồi gửi key cũ: bị từ chối.

Nếu mở rộng thành ứng dụng nhiều người dùng, bước tiếp theo là xác thực từng người và kiểm tra quyền trên từng tài nguyên, không chỉ kiểm tra token có tồn tại.
