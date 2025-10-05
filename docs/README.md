# Survey API Documentation

## Tổng quan

API này cung cấp các endpoint để quản lý và truy xuất dữ liệu khảo sát từ hệ thống Survey. API hỗ trợ các chức năng như lấy danh sách khảo sát, chi tiết khảo sát, câu hỏi, câu trả lời và kiểm tra trạng thái hoàn thành.

## Xác thực

API sử dụng Bearer Token để xác thực. Tất cả các request phải bao gồm header `Authorization` với Bearer token hợp lệ.

**Header bắt buộc:**

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWUsImlhdCI6MTUxNjIzOTAyMn0.KMUFsIDTnFmyG3nMiGM6H9FNFUROf3wh7SmqJp-QV30
```

**Token mẫu:**

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWUsImlhdCI6MTUxNjIzOTAyMn0.KMUFsIDTnFmyG3nMiGM6H9FNFUROf3wh7SmqJp-QV30
```

**Mã lỗi xác thực:**

- `401 Unauthorized`: Thiếu hoặc không hợp lệ Authorization header
- `403 Forbidden`: Token không hợp lệ

## Endpoints

### 1. Lấy danh sách khảo sát

**Endpoint:** `GET https://survey.uit.edu.vn/api/survey_api.php?action=getSurveys`

**Tham số:**

- `limit` (optional): Số lượng khảo sát mỗi trang (mặc định: 20)
- `page` (optional): Trang hiện tại (mặc định: 1)
- `active` (optional): Lọc theo trạng thái
  - `active`: Chỉ khảo sát đang hoạt động
  - `inactive`: Chỉ khảo sát không hoạt động
  - `expired`: Chỉ khảo sát đã hết hạn
- `title` (optional): Tìm kiếm theo tiêu đề
- `sid` (optional): Lọc theo ID khảo sát cụ thể
- `order` (optional): Sắp xếp theo trường (sid, startdate, expires, title)
- `direction` (optional): Hướng sắp xếp (ASC/DESC)

**Ví dụ:**

```
GET https://survey.uit.edu.vn/api/survey_api.php?action=getSurveys&limit=10&page=1&active=active&order=startdate&direction=DESC
```

**Response:**

```json
{
  "data": [
    {
      "sid": "414694",
      "title": "Phiếu khảo sát lấy ý kiến phản hồi từ sinh viên tốt nghiệp về khoá học năm 2025",
      "startdate": null,
      "expires": "2025-12-31 00:00:00",
      "active": "Y",
      "status": "active"
    },
    {
      "sid": "133247",
      "title": "Phiếu khảo sát lấy ý kiến sinh viên tốt nghiệp (Cựu sinh viên) năm 2025",
      "startdate": null,
      "expires": "2025-12-31 00:00:00",
      "active": "Y",
      "status": "active"
    }
  ],
  "meta": {
    "pagination": {
      "page": 1,
      "pageSize": 10,
      "pageCount": 1,
      "total": 2
    }
  }
}
```

### 2. Lấy chi tiết khảo sát

**Endpoint:** `GET https://survey.uit.edu.vn/api/survey_api.php?action=getSurveyDetail`

**Tham số bắt buộc:**

- `sid`: ID khảo sát

**Tham số tùy chọn:**

- `page` (optional): Trang hiện tại (mặc định: 1)
- `limit` (optional): Số lượng bản ghi mỗi trang (mặc định: 20)
- `email` (optional): Lọc theo email
- `firstname` (optional): Lọc theo tên
- `lastname` (optional): Lọc theo họ
- `completed` (optional): Lọc theo trạng thái hoàn thành (Y/N)
- `order` (optional): Sắp xếp theo trường
- `orderDirection` (optional): Hướng sắp xếp (ASC/DESC)

**Ví dụ:**

```
GET https://survey.uit.edu.vn/api/survey_api.php?action=getSurveyDetail&page=1&limit=2&sid=871292&completed=y
```

**Response:**

```json
{
  "success": true,
  "sid": 871292,
  "title": "Phiếu khảo sát về môn học - Học kỳ 2, năm 2024-2025",
  "data": [
    {
      "tid": "6",
      "firstname": " Hiếu",
      "lastname": "Trần Minh",
      "email": "18520281@gm.uit.edu.vn",
      "token": "snihn2q8vg6wuvz",
      "completed": "2025-06-13 08:15",
      "usesleft": "0",
      "validfrom": null,
      "validuntil": null,
      "attribute_1": "18520281",
      "attribute_2": "HTTT",
      "attribute_3": "13",
      "attribute_4": "CQUI",
      "attribute_5": "IT002.P212",
      "attribute_6": "80477",
      "attribute_7": "Trần Thị Hồng Yến",
      "attribute_8": "Lập trình hướng đối tượng",
      "attribute_9": "CNPM",
      "attribute_10": "D52480104",
      "attribute_11": "Thương mại điện tử"
    },
    {
      "tid": "7",
      "firstname": " Hiếu",
      "lastname": "Trần Minh",
      "email": "18520281@gm.uit.edu.vn",
      "token": "thgmeddrqsq4naf",
      "completed": "2025-06-13 08:16",
      "usesleft": "0",
      "validfrom": null,
      "validuntil": null,
      "attribute_1": "18520281",
      "attribute_2": "HTTT",
      "attribute_3": "13",
      "attribute_4": "CQUI",
      "attribute_5": "IT004.P21",
      "attribute_6": "80148",
      "attribute_7": "Nguyễn Đình Loan Phương",
      "attribute_8": "Cơ sở dữ liệu",
      "attribute_9": "HTTT",
      "attribute_10": "D52480104",
      "attribute_11": "Thương mại điện tử"
    }
  ],
  "attributes": {
    "attribute_1": "MSSV",
    "attribute_2": "Khoa",
    "attribute_3": "K",
    "attribute_4": "Hedt",
    "attribute_5": "MaLop",
    "attribute_6": "MaGV",
    "attribute_7": "TenGV",
    "attribute_8": "TenMH",
    "attribute_9": "KhoaQL",
    "attribute_10": "Nganh",
    "attribute_11": "TenNganh"
  },
  "meta": {
    "pagination": {
      "page": 1,
      "pageSize": 2,
      "pageCount": 12056,
      "total": 24112
    }
  }
}
```

### 3. Kiểm tra trạng thái hoàn thành khảo sát

**Endpoint:** `GET https://survey.uit.edu.vn/api/survey_api.php?action=checkSurveyCompletion`

**Tham số bắt buộc:**

- `sid`: ID khảo sát
- `email`: Email người tham gia

**Tham số tùy chọn:**

- `token` (optional): Token khảo sát

**Ví dụ:**

```
GET https://survey.uit.edu.vn/api/survey_api.php?action=checkSurveyCompletion&sid=123&email=nguyenvana@example.com
```

**Response:**

```json
{
  "data": {
    "token": "abc123",
    "firstname": "Nguyễn",
    "lastname": "Văn A",
    "email": "nguyenvana@example.com",
    "submitdate": "2024-01-15 10:30:00",
    "completed": true
  }
}
```

### 4. Lấy danh sách câu hỏi khảo sát

**Endpoint:** `GET https://survey.uit.edu.vn/api/survey_api.php?action=getSurveyQuestions`

**Tham số bắt buộc:**

- `sid`: ID khảo sát

**Ví dụ:**

```
GET https://survey.uit.edu.vn/api/survey_api.php?action=getSurveyQuestions&sid=123
```

**Response:**

```json
{
  "success": true,
  "sid": 123,
  "count": 10,
  "data": [
    {
      "qid": 1,
      "fieldname": "GENDER",
      "title": "GENDER",
      "question": "Giới tính của bạn là gì?",
      "type": "L",
      "mandatory": true,
      "parent_qid": 0,
      "group_order": 1,
      "group_name": "Thông tin cá nhân",
      "question_order": 1
    }
  ]
}
```

### 5. Lấy bản đồ câu hỏi

**Endpoint:** `GET https://survey.uit.edu.vn/api/survey_api.php?action=getQuestionMap`

**Tham số bắt buộc:**

- `sid`: ID khảo sát

**Ví dụ:**

```
GET https://survey.uit.edu.vn/api/survey_api.php?action=getQuestionMap&sid=123
```

**Response:**

```json
{
  "success": true,
  "sid": 123,
  "data": {
    "123X1X1": {
      "qid": 1,
      "title": "GENDER",
      "question": "Giới tính của bạn là gì?",
      "type": "L"
    }
  }
}
```

### 6. Lấy danh sách câu trả lời khảo sát

**Endpoint:** `GET https://survey.uit.edu.vn/api/survey_api.php?action=getSurveyResponses`

**Tham số bắt buộc:**

- `sid`: ID khảo sát

**Tham số tùy chọn:**

- `page` (optional): Trang hiện tại (mặc định: 1)
- `limit` (optional): Số lượng bản ghi mỗi trang (mặc định: 50)

**Ví dụ:**

```
GET https://survey.uit.edu.vn/api/survey_api.php?action=getSurveyResponses&sid=123&page=1&limit=100
```

**Response:**

```json
{
  "success": true,
  "sid": 123,
  "count": 100,
  "data": [
    {
      "id": 1,
      "token": "abc123",
      "submitdate": "2024-01-15 10:30:00",
      "123X1X1": "M",
      "123X1X2": "25",
      "token_info": {
        "token": "abc123",
        "email": "nguyenvana@example.com",
        "firstname": "Nguyễn",
        "lastname": "Văn A"
      }
    }
  ],
  "meta": {
    "pagination": {
      "page": 1,
      "pageSize": 100,
      "pageCount": 5,
      "total": 500
    }
  }
}
```

### 7. Lấy chi tiết câu trả lời

**Endpoint:** `GET https://survey.uit.edu.vn/api/survey_api.php?action=getSurveyAnswerDetail`

**Tham số bắt buộc:**

- `sid`: ID khảo sát
- `id`: ID câu trả lời

**Ví dụ:**

```
GET https://survey.uit.edu.vn/api/survey_api.php?action=getSurveyAnswerDetail&sid=123&id=1
```

**Response:**

```json
{
  "success": true,
  "sid": 123,
  "id": 1,
  "data": {
    "123X1X1": {
      "qid": 1,
      "parent_qid": 0,
      "code": "GENDER",
      "question": "Giới tính của bạn là gì?",
      "type": "L",
      "group_name": "Thông tin cá nhân",
      "value": "M"
    }
  }
}
```

### 8. Lấy tất cả câu trả lời với thông tin câu hỏi

**Endpoint:** `GET https://survey.uit.edu.vn/api/survey_api.php?action=getSurveyAnswers`

**Tham số bắt buộc:**

- `sid`: ID khảo sát

**Ví dụ:**

```
GET https://survey.uit.edu.vn/api/survey_api.php?action=getSurveyAnswers&sid=123
```

**Response:**

```json
{
  "success": true,
  "sid": 123,
  "count": 500,
  "data": [
    {
      "id": 1,
      "123X1X1": {
        "qid": 1,
        "parent_qid": 0,
        "code": "GENDER",
        "question": "Giới tính của bạn là gì?",
        "type": "L",
        "group_name": "Thông tin cá nhân",
        "value": "M"
      }
    }
  ]
}
```

## Mã lỗi

API trả về các mã lỗi HTTP chuẩn:

- `200`: Thành công
- `400`: Bad Request - Tham số không hợp lệ hoặc thiếu
- `401`: Unauthorized - Thiếu hoặc không hợp lệ Authorization header
- `403`: Forbidden - Token không hợp lệ
- `404`: Not Found - Không tìm thấy dữ liệu
- `500`: Internal Server Error - Lỗi server

## Cấu trúc dữ liệu

### Trạng thái khảo sát

- `active`: Khảo sát đang hoạt động
- `inactive`: Khảo sát không hoạt động
- `expired`: Khảo sát đã hết hạn

### Loại câu hỏi

- `L`: List (Danh sách lựa chọn)
- `M`: Multiple choice (Nhiều lựa chọn)
- `P`: Multiple choice with comments (Nhiều lựa chọn có bình luận)
- `T`: Long free text (Văn bản dài)
- `S`: Short free text (Văn bản ngắn)
- `N`: Numerical input (Số)
- `Y`: Yes/No (Có/Không)
- `Q`: Nhiều ô đánh giá bằng text
- `F`: Ma trận 10 cột

## Lưu ý

1. Tất cả các endpoint đều trả về dữ liệu dưới dạng JSON
2. API hỗ trợ phân trang cho các endpoint lấy danh sách
3. Các tham số tìm kiếm hỗ trợ tìm kiếm mờ (LIKE)
4. API tự động xử lý encoding UTF-8 cho tiếng Việt
5. Các bảng token và survey được tạo động theo ID khảo sát

## Ví dụ sử dụng

### JavaScript (Fetch API)

```javascript
// Token xác thực
const token =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWUsImlhdCI6MTUxNjIzOTAyMn0.KMUFsIDTnFmyG3nMiGM6H9FNFUROf3wh7SmqJp-QV30";

// Lấy danh sách khảo sát
fetch(
  "https://survey.uit.edu.vn/api/survey_api.php?action=getSurveys&limit=10&active=active",
  {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  }
)
  .then((response) => response.json())
  .then((data) => {
    console.log("Danh sách khảo sát:", data.data);
  })
  .catch((error) => {
    console.error("Lỗi:", error);
  });

// Kiểm tra trạng thái hoàn thành
fetch(
  "https://survey.uit.edu.vn/api/survey_api.php?action=checkSurveyCompletion&sid=123&email=user@example.com",
  {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  }
)
  .then((response) => response.json())
  .then((data) => {
    if (data.data.completed) {
      console.log("Khảo sát đã hoàn thành");
    }
  });
```

### PHP (cURL)

```php
// Token xác thực
$token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWUsImlhdCI6MTUxNjIzOTAyMn0.KMUFsIDTnFmyG3nMiGM6H9FNFUROf3wh7SmqJp-QV30';

// Lấy chi tiết khảo sát
$url = 'https://survey.uit.edu.vn/api/survey_api.php?action=getSurveyDetail&sid=123&limit=50';
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, array(
    'Authorization: Bearer ' . $token,
    'Content-Type: application/json'
));
$response = curl_exec($ch);
curl_close($ch);

$data = json_decode($response, true);
if ($data['success']) {
    echo "Tổng số bản ghi: " . $data['meta']['pagination']['total'];
}
```

### Python (requests)

```python
import requests

# Token xác thực
token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWUsImlhdCI6MTUxNjIzOTAyMn0.KMUFsIDTnFmyG3nMiGM6H9FNFUROf3wh7SmqJp-QV30'

# Headers với Bearer token
headers = {
    'Authorization': f'Bearer {token}',
    'Content-Type': 'application/json'
}

# Lấy danh sách khảo sát
response = requests.get(
    'https://survey.uit.edu.vn/api/survey_api.php?action=getSurveys&limit=10',
    headers=headers
)

if response.status_code == 200:
    data = response.json()
    print("Danh sách khảo sát:", data['data'])
else:
    print("Lỗi:", response.status_code, response.text)
```

### cURL Command Line

```bash
# Lấy danh sách khảo sát
curl -X GET \
  "https://survey.uit.edu.vn/api/survey_api.php?action=getSurveys&limit=10" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWUsImlhdCI6MTUxNjIzOTAyMn0.KMUFsIDTnFmyG3nMiGM6H9FNFUROf3wh7SmqJp-QV30" \
  -H "Content-Type: application/json"

# Kiểm tra trạng thái hoàn thành
curl -X GET \
  "https://survey.uit.edu.vn/api/survey_api.php?action=checkSurveyCompletion&sid=123&email=user@example.com" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWUsImlhdCI6MTUxNjIzOTAyMn0.KMUFsIDTnFmyG3nMiGM6H9FNFUROf3wh7SmqJp-QV30" \
  -H "Content-Type: application/json"
```
