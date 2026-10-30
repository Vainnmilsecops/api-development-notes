# API document

Tài liệu API cần đủ để người khác gửi được request mà chưa cần đọc code. Ghi rõ lỗi để người gọi biết cần sửa request ở đâu.

Một endpoint nên ghi: method, URL, mục đích, xác thực, tham số/body, quy tắc kiểm tra, response thành công và lỗi có thể gặp.

## Ví dụ: tạo task

`POST /api/tasks`

Cần `x-api-key` khớp cấu hình server và `Content-Type: application/json`.

Body:

```json
{
  "title": "Thử PATCH một task",
  "completed": false
}
```

- `title`: bắt buộc, chuỗi sau khi bỏ khoảng trắng hai đầu dài từ 1 đến 120 ký tự.
- `completed`: không bắt buộc, boolean; mặc định `false`.
- Các trường khác bị từ chối. Không gửi `id`, server tự tạo.

Thành công: `201 Created`, header `Location: /api/tasks/<id>`.

```json
{
  "data": {
    "id": 3,
    "title": "Thử PATCH một task",
    "completed": false
  }
}
```

Lỗi: `400` nếu dữ liệu hoặc JSON không hợp lệ; `401` nếu thiếu/sai key; `415` nếu không gửi JSON. Lỗi có dạng `{"error":{"message":"..."}}`, trong đó message giải thích lỗi.

Đừng copy cứng ID `3` vào mọi lần chạy: ID thực nằm trong response.

## OpenAPI và Swagger

[openapi.yaml](../openapi.yaml) mô tả các endpoint và schema của demo bằng OpenAPI. Đây là bản mô tả để công cụ và con người cùng đọc. `openapi` là phiên bản đặc tả, còn `info.version` là phiên bản API do dự án đặt.

Swagger là tên bộ công cụ như Swagger Editor và Swagger UI. OpenAPI là đặc tả; hai tên này không hoàn toàn thay thế cho nhau. Demo có file đặc tả, không dựng sẵn trang Swagger UI.

Khi viết OpenAPI, `parameters` dùng cho path/query/header, `requestBody` dùng cho body, `responses` mô tả từng status. Khai báo security scheme chưa đủ; còn phải áp dụng nó vào operation cần bảo vệ.

Nguồn: [OpenAPI Specification](https://spec.openapis.org/oas/v3.0.4.html), [Swagger – OpenAPI và Swagger](https://swagger.io/docs/specification/v3_0/about/).

## Giữ tài liệu khớp code

Trong repo này, đọc ghi chú để hiểu, dùng `requests.http` để thử, xem `openapi.yaml` để biết hợp đồng dữ liệu. Khi sửa API, sửa cả ví dụ và đặc tả liên quan.

Một lỗi hay gặp là code cho phép field rỗng nhưng tài liệu lại ghi bắt buộc. Test luồng tạo/sửa/xóa và vài request sai giúp phát hiện chỗ lệch đó.

Dữ liệu demo chỉ ở bộ nhớ, mất khi restart. `GET /api/tasks?completed=false` chỉ lọc, chưa phân trang. Những giới hạn như vậy cũng nên ghi rõ trong tài liệu.
