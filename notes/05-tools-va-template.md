# API tool và template

## Gửi request từ editor

Mở repo trong VS Code, cài [REST Client](https://marketplace.visualstudio.com/items?itemName=humao.rest-client), chạy server rồi mở [requests.http](../requests.http). Bấm **Send Request** phía trên request cần thử.

File `.http` chỉ là văn bản nên dễ sửa và đưa vào Git. Dấu `###` chia các request. Key dùng trong request phải khớp `API_KEY` của server; ví dụ trong repo dùng key thử `local-practice-key`.

Nên thử theo thứ tự: đọc danh sách → tạo task → dùng ID vừa tạo để sửa → xóa → đọc lại ID đó. Sau đó thử sai key, title rỗng và `completed` sai kiểu.

Postman cũng dùng được: chọn method, nhập URL, thêm header, chọn Body → raw → JSON. Có thể dùng biến `baseUrl`, `apiKey`; tránh export key thật vào collection được commit.

## Gọi nhanh từ terminal

Trên Windows dùng `curl.exe` để gọi đúng cURL, tránh alias `curl` ở một số bản PowerShell:

```powershell
curl.exe -i http://127.0.0.1:3000/health
curl.exe -i 'http://127.0.0.1:3000/api/tasks?completed=false'
```

Nếu cần gửi JSON bằng PowerShell, `Invoke-RestMethod` đỡ phải xử lý dấu nháy của chương trình native:

```powershell
$headers = @{ 'x-api-key' = 'local-practice-key' }
$body = @{ title = 'Thu API'; completed = $false } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri 'http://127.0.0.1:3000/api/tasks' -Headers $headers -ContentType 'application/json' -Body $body
```

`-i` của cURL cho xem cả response header. Khi debug, kiểm tra URL/port, method, key và `Content-Type` trước, rồi mới kiểm tra body. Nếu request không tới server thì xem process đang chạy và lỗi kết nối ở terminal.

## Mẫu ghi lại một endpoint

Copy phần này khi bổ sung endpoint mới:

````markdown
### Tên thao tác

`METHOD /api/resources/{id}`

- Mục đích:
- Xác thực:
- Path/query parameters:
- Body và quy tắc kiểm tra:

Request mẫu:
```http
METHOD /api/resources/1
```

Response thành công: status, headers cần chú ý, body mẫu.

Lỗi có thể gặp: status và điều kiện xảy ra.

Ghi chú: tác động khi gọi lặp lại, giới hạn, dữ liệu có được lưu lâu dài không.
````

Phần mẫu là khung để điền, không phải endpoint đang có trong demo. Khi tài liệu dài hơn thì cập nhật OpenAPI trước, giữ ghi chú Markdown cho phần giải thích và ví dụ dễ hiểu.
