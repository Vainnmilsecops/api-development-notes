# API authentication

Một API cần biết bên nào đang gọi và bên đó được làm gì. Hai câu hỏi này được xử lý ở những bước khác nhau.
Chương này đi từ API key của demo tới session, JWT và OAuth; chỉ phần API key đã có trong code.

## Authentication và authorization

- **Authentication**: kiểm tra thông tin xác thực để nhận diện người dùng hoặc ứng dụng gọi API.
- **Authorization**: quyết định danh tính đó được thực hiện hành động nào trên tài nguyên nào.

Ví dụ mở rộng Tasks API: An đăng nhập thành công và muốn sửa task số 12 của Bình.
Token hợp lệ xác nhận An là ai; server vẫn phải kiểm tra An có quyền sửa task 12 hay không.
Kiểm tra token rồi bỏ qua quyền sở hữu là lỗi **BOLA** — Broken Object Level Authorization.
Đổi ID từ `12` sang `13` không được trở thành cách đọc dữ liệu người khác. [OWASP – BOLA](https://owasp.org/API-Security/editions/2023/en/0xa1-broken-object-level-authorization/).

## API key trong repo

API key là một secret cấp cho bên gọi. Middleware của demo so sánh header `x-api-key` với `API_KEY` trong môi trường server.

```http
PATCH /api/tasks/1 HTTP/1.1
Host: localhost:3000
x-api-key: local-practice-key
Content-Type: application/json

{"completed":true}
```

- `GET /health`, `GET /api/tasks`, `GET /api/tasks/:id`: đọc công khai.
- `POST /api/tasks`, `PATCH /api/tasks/:id`, `DELETE /api/tasks/:id`: cần key đúng.
- Thiếu hoặc sai key: nhận `401` cùng `{"error":{"message":"..."}}`.
- Middleware kiểm tra key trước khi tìm task hoặc kiểm tra body của route ghi.

Repo dùng chung một key, không có tài khoản, chủ sở hữu task, scope hay thời hạn key.
Ai có key đều sửa được tất cả task. Giá trị trong `.env.example` chỉ để chạy thử.

Trong hệ thống nhiều client, thường cấp key riêng cho từng ứng dụng để theo dõi mức dùng và thu hồi riêng.
Key không tự chứng minh danh tính một người dùng; cũng không thay thế kiểm tra quyền trên dữ liệu.
Không đưa secret vào URL, mã frontend hoặc log request. [OWASP – REST security](https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html#api-keys).

## Basic authentication

Basic gửi `username:password` đã encode Base64 trong header:

```http
Authorization: Basic <base64-cua-username:password>
```

Base64 có thể decode lại, không phải mã hóa để giữ bí mật.
Basic cần HTTPS và quản lý credential cẩn thận vì credential được gửi lại trong request sử dụng scheme này.
Không dán giá trị thật vào ảnh chụp, issue hoặc log. Demo không hỗ trợ Basic. [RFC 7617](https://www.rfc-editor.org/rfc/rfc7617.html#section-4).

## Bearer token

```http
Authorization: Bearer <access-token>
```

Bearer nghĩa là bên giữ token có thể dùng quyền token cấp, không cần chứng minh sở hữu khóa mật mã riêng.
Token bị lộ có thể bị dùng lại trong thời gian còn hiệu lực, nên phải bảo vệ cả khi lưu và khi truyền qua HTTPS.
Token có thể là chuỗi **opaque** để server tra cứu hoặc introspect; cũng có thể là JWT để server kiểm tra theo định dạng đã thống nhất.
Tên `Bearer` không cho biết token có phải JWT hay không. [RFC 6750](https://www.rfc-editor.org/rfc/rfc6750.html#section-1.2).

## JWT: chứa gì và kiểm tra gì?

JWT là định dạng mang claims. JWT có chữ ký theo JWS compact thường gồm ba phần Base64URL, ngăn bằng dấu chấm:

```text
header.payload.signature
```

- `header`: thông tin như thuật toán `alg`, có thể có mã khóa `kid`.
- `payload`: các claims về chủ thể và ngữ cảnh token.
- `signature`: dùng để kiểm tra tính toàn vẹn và bên ký theo cấu hình xác thực.

Một số claims thường gặp:

- `sub`: chủ thể token đại diện.
- `iss`: bên phát hành.
- `aud`: bên nhận dự kiến.
- `exp`: thời điểm hết hạn.
- `nbf`: thời điểm sớm nhất được chấp nhận.
- `jti`: định danh token, có thể phục vụ theo dõi hoặc chống dùng lại khi hệ thống có kiểm tra.

Các claim thời gian trên dùng số giây từ Unix epoch, không phải mili giây JavaScript.
Profile ứng dụng quyết định claim nào bắt buộc; không phải JWT nào cũng có đủ danh sách trên. [RFC 7519](https://www.rfc-editor.org/rfc/rfc7519.html#section-4.1).

Chữ ký không che payload. JWT được ký có thể đọc được nội dung; JWT mã hóa bằng JWE là dạng khác.
Không đặt password hoặc dữ liệu bí mật vào payload chỉ vì token có chữ ký. [OWASP – JWT](https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html#jwt).

**Decode khác verify.** Đọc được JSON hoặc thấy `"role":"admin"` chưa chứng minh bất cứ quyền nào.
Khi triển khai, dùng thư viện được duy trì để thực hiện xác minh, thay vì tự viết hàm chia chuỗi và kiểm chữ ký.

Ứng dụng cần cấu hình rõ:

1. Thuật toán cho phép ở phía server; không để token tự chọn tùy ý qua `alg`.
2. Khóa tin cậy và việc kiểm tra chữ ký; không theo URL khóa bất kỳ từ token.
3. Issuer, audience và loại token đúng với API đang nhận.
4. Thời hạn `exp`, điều kiện `nbf` nếu có và độ lệch đồng hồ cho phép.
5. Claims bắt buộc theo profile; sau đó mới xét quyền nghiệp vụ.

Token đúng chữ ký nhưng dành cho API khác vẫn phải bị từ chối.
`kid` là thông tin chọn khóa trong nguồn tin cậy, không phải bằng chứng token hợp lệ. [RFC 8725](https://www.rfc-editor.org/rfc/rfc8725.html#section-3).

## Access token, refresh token và đăng xuất

Access token được gửi đến API. Refresh token, nếu được cấp, được gửi tới token endpoint để xin access token mới;
không dùng refresh token thay access token để gọi `/api/tasks`. [RFC 6749](https://www.rfc-editor.org/rfc/rfc6749.html#section-1.5).

Ví dụ vòng đời ở một ứng dụng có đăng nhập, chưa có trong demo:

```text
đăng nhập/cấp quyền → nhận access token và có thể nhận refresh token
gọi API bằng access token → hết hạn → dùng refresh token xin token mới
refresh không hợp lệ/bị thu hồi → yêu cầu đăng nhập hoặc cấp quyền lại
```

Access token thường có thời hạn ngắn để hạn chế khoảng thời gian bị lợi dụng nếu lộ.
Refresh token cần bảo vệ riêng. Với refresh token rotation, mỗi lần dùng sẽ nhận token mới và token cũ mất hiệu lực.
Server giữ liên hệ giữa các lần cấp để phát hiện token cũ bị dùng lại, rồi có thể thu hồi chuỗi token liên quan.
RFC 9700 yêu cầu public client dùng rotation hoặc cơ chế ràng buộc refresh token với bên gửi. [RFC 9700, mục 4.14](https://www.rfc-editor.org/rfc/rfc9700.html#section-4.14).

Xóa token ở client khi logout không làm bản sao đã bị đánh cắp tự mất hiệu lực.
JWT tự chứa dữ liệu, nếu chỉ kiểm chữ ký và thời hạn, vẫn có thể được chấp nhận tới `exp`.
Muốn thu hồi sớm cần thêm cơ chế phía server, chẳng hạn trạng thái phiên hoặc danh sách thu hồi được kiểm tra khi gọi API.
Thu hồi refresh token không bảo đảm mọi access token đã cấp lập tức bị từ chối ở mọi resource server. [RFC 7009](https://www.rfc-editor.org/rfc/rfc7009.html#section-3).

## Session cookie và chỗ lưu token trên trình duyệt

Với session phía server, trình duyệt giữ mã phiên ngẫu nhiên trong cookie; server tra phiên để tìm người dùng.
Khi đăng nhập hoặc thay đổi quyền, cần quản lý vòng đời và đổi mã phiên phù hợp; logout phải vô hiệu phiên phía server. [OWASP – Session management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html).

```http
Set-Cookie: session=<opaque-id>; Path=/; HttpOnly; Secure; SameSite=Lax
```

- `HttpOnly`: JavaScript không đọc trực tiếp cookie qua `document.cookie`.
- `Secure`: cookie gửi qua kết nối bảo mật; ngoại lệ cho localhost tùy trình duyệt.
- `SameSite`: kiểm soát việc gửi cookie trong ngữ cảnh cùng site hoặc khác site; khác khái niệm origin.

Thuộc tính cookie phải phù hợp luồng ứng dụng; `SameSite=None` cần `Secure`. [MDN – Cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Cookies).

Cookie có thể được trình duyệt tự gửi kèm request, nên route thay đổi dữ liệu cần xét **CSRF**.
`SameSite` giảm một số tình huống nhưng không thay mọi biện pháp khác; tùy kiến trúc cần CSRF token và kiểm tra Origin.
Không dùng GET để thay đổi trạng thái nghiệp vụ. [OWASP – CSRF prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html).

Token ở `localStorage` đọc được bởi JavaScript cùng origin; XSS có thể đánh cắp token.
Cookie `HttpOnly` giảm việc đọc trực tiếp secret nhưng XSS vẫn có thể gửi request dưới phiên của người dùng.
Lưu token trong bộ nhớ cũng không tự loại bỏ XSS. Chọn nơi lưu theo kiến trúc, thời hạn và mô hình đe dọa. [OWASP – HTML5 storage](https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html#local-storage).

## OAuth 2.0 và OpenID Connect

OAuth 2.0 giải quyết việc cấp quyền truy cập. Ví dụ người dùng cho một ứng dụng đọc lịch ở dịch vụ khác mà không đưa password cho ứng dụng đó.
Bốn vai trò cơ bản là resource owner (bên có quyền với dữ liệu), client (ứng dụng xin quyền), authorization server (cấp token), resource server (API giữ dữ liệu).
Authorization server và resource server có thể cùng hệ thống nhưng đảm nhiệm vai trò khác nhau. [RFC 6749, mục 1.1](https://www.rfc-editor.org/rfc/rfc6749.html#section-1.1).

Luồng Authorization Code + PKCE cho ứng dụng public client như SPA hoặc mobile:

1. Client tạo `code_verifier` ngẫu nhiên và suy ra `code_challenge` bằng phương thức `S256`.
2. Chuyển người dùng tới authorization endpoint với client ID, redirect URI, scope và challenge.
3. Sau bước đăng nhập/cấp quyền, server chuyển về redirect URI đã đăng ký cùng authorization code.
4. Client đổi code ở token endpoint, gửi kèm verifier ban đầu.
5. Server kiểm tra verifier khớp challenge trước khi cấp token; client dùng access token gọi API.

Public client không giữ được client secret bí mật. PKCE ràng buộc lần đổi code với bên khởi tạo luồng;
secret nhúng trong bundle SPA không thay thế được PKCE. [RFC 7636](https://www.rfc-editor.org/rfc/rfc7636.html#section-4).

`state` gắn phản hồi authorization với giao dịch do client khởi tạo và thường dùng chống CSRF;
`nonce` trong OIDC gắn ID token với lần đăng nhập, giúp chống phát lại.
Khi đã gửi nonce, client phải kiểm tra nonce nhận lại trong ID token; hai tham số không thể thay nhau tùy ý. [OpenID Connect Core](https://openid.net/specs/openid-connect-core-1_0.html#AuthRequest).

OIDC bổ sung lớp xác thực người dùng trên OAuth 2.0. Client kiểm tra **ID token** để biết kết quả đăng nhập;
**access token** phục vụ truy cập resource server. Không lấy ID token gửi API như một access token.
`aud` của ID token thường trỏ tới client, khác audience của API. [OpenID Connect – ID token](https://openid.net/specs/openid-connect-core-1_0.html#IDToken).

Với triển khai mới, theo hướng dẫn hiện hành dùng Authorization Code + PKCE, chọn `S256` và kiểm tra redirect URI chặt chẽ.
RFC 9700 yêu cầu public client dùng PKCE và khuyến nghị cơ chế này cho confidential client.
Không chọn implicit flow trả access token qua authorization response hoặc password grant như mẫu mặc định;
RFC 9700 yêu cầu không dùng resource owner password credentials grant. [RFC 9700, mục 2](https://www.rfc-editor.org/rfc/rfc9700.html#section-2).

## Kiểm tra quyền và đọc lỗi xác thực

Scope như `tasks:write` giới hạn nhóm hành động, nhưng không tự chứng minh quyền sở hữu một task.
Trong ứng dụng nhiều người dùng, server cần kiểm tra người gọi có quyền trên từng object và từng hành động.
Lấy `ownerId` từ body rồi tin luôn cũng không đủ: danh tính phải đến từ ngữ cảnh đã xác thực. [OWASP – BOLA](https://owasp.org/API-Security/editions/2023/en/0xa1-broken-object-level-authorization/).

- `401`: thiếu hoặc không có thông tin xác thực hợp lệ.
- `403`: server hiểu request nhưng từ chối thực hiện, thường là đã xác thực nhưng thiếu quyền.
- `404`: tài nguyên không tìm thấy; hệ thống có thể dùng để không tiết lộ tài nguyên mà người gọi không được biết.

HTTP authentication chuẩn yêu cầu phản hồi `401` có challenge `WWW-Authenticate`, ví dụ `Bearer realm="tasks"`.
Demo trả `401` cho header key riêng nhưng chưa triển khai challenge theo một HTTP authentication scheme đầy đủ. [RFC 9110, mục 15.5](https://www.rfc-editor.org/rfc/rfc9110.html#section-15.5.2).

## Khi triển khai thật

- Dùng TLS, hạn chế quyền và rate limit theo client; đừng coi key hợp lệ là được gọi không giới hạn. [OWASP – REST security](https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html).
- Không commit secret. Khi lộ key, thu hồi và thay key; xóa khỏi commit mới không xóa các bản sao trong lịch sử Git. [OWASP – Secrets management](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html).
- Password người dùng cần hàm băm dành cho password như Argon2id cùng salt qua thư viện phù hợp; không lưu plaintext hay chỉ SHA-256. [OWASP – Password storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html).
- Log đủ để điều tra lỗi, che key/token/password; quy định cách cấp, hết hạn và thu hồi credential. [OWASP – Secrets lifecycle](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html#27-secret-lifecycle).

## Thử với API mẫu

1. GET `/api/tasks/1` không gửi key: vẫn nhận dữ liệu.
2. POST `/api/tasks` không key, body hợp lệ: nhận `401`.
3. Thêm key đúng và gửi `{"title":"Thử auth"}`: nhận `201`.
4. PATCH `/api/tasks/99999` với body `{"completed":true}`: không key nhận `401`, có key đúng mới nhận `404`.
5. Đổi `API_KEY` trong `.env`, khởi động lại, gửi key cũ: nhận `401`.

JWT, refresh token, cookie, OAuth/OIDC và phân quyền theo chủ sở hữu là kiến thức để mở rộng; repo chưa có các cơ chế đó.
Khi thêm đăng nhập, hãy dùng thư viện hoặc nhà cung cấp hỗ trợ chuẩn rồi bổ sung kiểm tra quyền riêng của ứng dụng.

## Nguồn để đọc tiếp

- [RFC 6749](https://www.rfc-editor.org/rfc/rfc6749.html), [RFC 6750](https://www.rfc-editor.org/rfc/rfc6750.html): OAuth và cách dùng Bearer token.
- [RFC 7519](https://www.rfc-editor.org/rfc/rfc7519.html), [RFC 8725](https://www.rfc-editor.org/rfc/rfc8725.html): JWT và quy tắc xác minh.
- [RFC 7636](https://www.rfc-editor.org/rfc/rfc7636.html), [RFC 9700](https://www.rfc-editor.org/rfc/rfc9700.html): PKCE và hướng dẫn bảo mật OAuth hiện hành.
- [OpenID Connect Core](https://openid.net/specs/openid-connect-core-1_0.html): lớp xác thực, ID token và nonce.
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/): tra cứu session, CSRF, secret và password storage.
