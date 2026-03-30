# SkillShub API 使用指南

> 完整的 API 文档和开发者指南，帮助你集成 SkillShub 平台

---

## 📖 目录

1. [API 概览](#api-概览)
2. [认证](#认证)
3. [错误处理](#错误处理)
4. [API 端点](#api-端点)
5. [代码示例](#代码示例)
6. [最佳实践](#最佳实践)

---

## API 概览

### 基本信息

| 项目 | 说明 |
|------|------|
| **Base URL** | `https://api.skillshub.example.com/api` |
| **API 版本** | v1 |
| **数据格式** | JSON |
| **字符编码** | UTF-8 |
| **认证方式** | Bearer Token (JWT) |

### 认证

大多数 API 端点使用 JWT (JSON Web Token) 进行认证：

**公开端点（无需认证）：**
- 获取技能列表
- 获取技能详情
- 获取热门分类
- 获取热门标签
- 获取搜索建议
- 获取技能评分统计
- 获取技能评论列表

**受保护端点（需要认证）：**
- 创建/更新/删除技能
- 创建/更新/删除评论
- 添加/取消收藏
- 创建/更新/删除评分
- 创建/回滚技能版本

### 请求格式

**GET 请求：**
```bash
curl -X GET "https://api.skillshub.example.com/api/skills?page=1&page_size=20"
```

**POST 请求（需要认证）：**
```bash
curl -X POST "https://api.skillshub.example.com/api/skills" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "My Skill",
    "description": "A useful skill",
    "content": "Detailed content...",
    "category": "Tutorial",
    "tags": ["AI", "Python"]
  }'
```

### 响应格式

**成功响应：**
```json
{
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "title": "My Skill",
    ...
  }
}
```

**错误响应：**
```json
{
  "error": "Error message",
  "error_code": "ERROR_CODE",
  "details": "Additional error details"
}
```

---

## 认证

### 用户注册

**端点：** `POST /api/auth/register`

**请求体：**
```json
{
  "username": "myuser",
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**响应：**
```json
{
  "data": {
    "user_id": "123e4567-e89b-12d3-a456-426614174000",
    "username": "myuser",
    "email": "user@example.com"
  }
}
```

**错误示例：**
- `AUTH_ERROR`：用户名已存在
- `VALIDATION_ERROR`：输入验证失败

---

### 用户登录

**端点：** `POST /api/auth/login`

**请求体：**
```json
{
  "username": "myuser",
  "password": "securepassword123"
}
```

**响应：**
```json
{
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user_id": "123e4567-e89b-12d3-a456-426614174000",
    "username": "myuser"
  }
}
```

**错误示例：**
- `AUTH_ERROR`：用户名或密码错误

**使用 Token：**
```bash
# 在请求头中添加 Authorization
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

### Token 有效期

- **有效期**：24 小时
- **过期后**：需要重新登录获取新 Token
- **续期**：当前版本不支持 Token 续期

---

## 错误处理

### HTTP 状态码

| 状态码 | 说明 |
|--------|------|
| **200** | 请求成功 |
| **201** | 创建成功 |
| **204** | 删除成功（无返回内容） |
| **400** | 请求参数错误 |
| **401** | 未授权（Token 无效或缺失） |
| **403** | 禁止访问（权限不足） |
| **404** | 资源不存在 |
| **409** | 冲突（如重复创建） |
| **422** | 验证错误 |
| **500** | 服务器内部错误 |

### 错误码

| 错误码 | 说明 |
|--------|------|
| `AUTH_ERROR` | 认证错误 |
| `VALIDATION_ERROR` | 输入验证失败 |
| `NOT_FOUND` | 资源不存在 |
| `PERMISSION_DENIED` | 权限不足 |
| `CONFLICT` | 资源冲突 |
| `INTERNAL_ERROR` | 服务器内部错误 |

### 错误响应示例

**认证错误：**
```json
{
  "error": "Authentication error",
  "error_code": "AUTH_ERROR"
}
```

**验证错误：**
```json
{
  "error": "Validation error: Username must be between 3 and 50 characters",
  "error_code": "VALIDATION_ERROR",
  "details": "Username must be between 3 and 50 characters"
}
```

**权限错误：**
```json
{
  "error": "Permission denied",
  "error_code": "PERMISSION_DENIED",
  "details": "You do not have permission to update this skill"
}
```

---

## API 端点

### 技能管理

#### 获取技能列表

**端点：** `GET /api/skills`

**查询参数：**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `page` | integer | 否 | 页码，默认 1 |
| `page_size` | integer | 否 | 每页数量，默认 20 |
| `search` | string | 否 | 搜索关键词 |
| `category` | string | 否 | 分类过滤 |
| `tags` | string | 否 | 标签过滤（逗号分隔） |
| `sort_by` | string | 否 | 排序字段（created_at、rating_avg、download_count） |
| `sort_order` | string | 否 | 排序方向（asc、desc） |

**请求示例：**
```bash
curl -X GET "https://api.skillshub.example.com/api/skills?page=1&page_size=20&search=AI&tags=Python,Rust"
```

**响应：**
```json
{
  "data": {
    "total": 100,
    "page": 1,
    "page_size": 20,
    "items": [
      {
        "id": "123e4567-e89b-12d3-a456-426614174000",
        "title": "AI Assistant",
        "description": "A helpful AI assistant",
        "author_username": "myuser",
        "category": "Tutorial",
        "tags": ["AI", "Python"],
        "version": "1.0.0",
        "rating_avg": 4.5,
        "rating_count": 10,
        "download_count": 100,
        "created_at": "2026-03-01T10:00:00Z",
        "updated_at": "2026-03-01T10:00:00Z"
      }
    ]
  }
}
```

---

#### 获取技能详情

**端点：** `GET /api/skills/:id`

**请求示例：**
```bash
curl -X GET "https://api.skillshub.example.com/api/skills/123e4567-e89b-12d3-a456-426614174000"
```

**响应：**
```json
{
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "title": "AI Assistant",
    "description": "A helpful AI assistant",
    "content": "Detailed content...",
    "author_id": "123e4567-e89b-12d3-a456-426614174000",
    "author_username": "myuser",
    "category": "Tutorial",
    "tags": ["AI", "Python"],
    "version": "1.0.0",
    "download_count": 100,
    "rating_avg": 4.5,
    "rating_count": 10,
    "created_at": "2026-03-01T10:00:00Z",
    "updated_at": "2026-03-01T10:00:00Z",
    "versions": [
      {
        "version": "1.0.0",
        "changelog": "Initial release",
        "created_at": "2026-03-01T10:00:00Z"
      }
    ]
  }
}
```

---

#### 创建技能

**端点：** `POST /api/skills`

**认证：** 需要

**请求体：**
```json
{
  "title": "My Skill",
  "description": "A useful skill",
  "content": "Detailed content...",
  "category": "Tutorial",
  "tags": ["AI", "Python"]
}
```

**响应：**
```json
{
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "title": "My Skill",
    "description": "A useful skill",
    "content": "Detailed content...",
    "author_id": "123e4567-e89b-12d3-a456-426614174000",
    "author_username": "myuser",
    "category": "Tutorial",
    "tags": ["AI", "Python"],
    "version": "1.0.0",
    "created_at": "2026-03-09T06:00:00Z",
    "updated_at": "2026-03-09T06:00:00Z"
  }
}
```

**错误示例：**
- `VALIDATION_ERROR`：标题或内容为空
- `AUTH_ERROR`：未提供或无效的 Token

---

#### 更新技能

**端点：** `PUT /api/skills/:id`

**认证：** 需要（仅作者）

**请求体：**
```json
{
  "title": "Updated Title",
  "description": "Updated description",
  "category": "Tutorial",
  "tags": ["AI", "Python", "Updated"]
}
```

**响应：**
```json
{
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "title": "Updated Title",
    "description": "Updated description",
    "content": "Detailed content...",
    "author_id": "123e4567-e89b-12d3-a456-426614174000",
    "author_username": "myuser",
    "category": "Tutorial",
    "tags": ["AI", "Python", "Updated"],
    "version": "1.0.0",
    "updated_at": "2026-03-09T07:00:00Z"
  }
}
```

**错误示例：**
- `PERMISSION_DENIED`：不是技能的作者
- `NOT_FOUND`：技能不存在

---

#### 删除技能

**端点：** `DELETE /api/skills/:id`

**认证：** 需要（仅作者）

**请求示例：**
```bash
curl -X DELETE "https://api.skillshub.example.com/api/skills/123e4567-e89b-12d3-a456-426614174000" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**响应：**
```json
{
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "message": "Skill deleted successfully"
  }
}
```

**错误示例：**
- `PERMISSION_DENIED`：不是技能的作者
- `NOT_FOUND`：技能不存在

---

### 技能搜索

#### 获取热门分类

**端点：** `GET /api/skills/categories/popular`

**请求示例：**
```bash
curl -X GET "https://api.skillshub.example.com/api/skills/categories/popular"
```

**响应：**
```json
{
  "data": [
    {
      "category": "Tutorial",
      "skill_count": 50
    },
    {
      "category": "Automation",
      "skill_count": 30
    }
  ]
}
```

---

#### 获取热门标签

**端点：** `GET /api/skills/tags/popular`

**请求示例：**
```bash
curl -X GET "https://api.skillshub.example.com/api/skills/tags/popular"
```

**响应：**
```json
{
  "data": [
    {
      "tag": "AI",
      "skill_count": 80
    },
    {
      "tag": "Python",
      "skill_count": 60
    }
  ]
}
```

---

#### 获取搜索建议

**端点：** `GET /api/skills/search/suggestions`

**查询参数：**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `q` | string | 是 | 搜索关键词（最少 2 个字符） |

**请求示例：**
```bash
curl -X GET "https://api.skillshub.example.com/api/skills/search/suggestions?q=AI"
```

**响应：**
```json
{
  "data": [
    {
      "title": "AI Assistant",
      "id": "123e4567-e89b-12d3-a456-426614174000"
    },
    {
      "title": "AI Chatbot",
      "id": "456e7890-e89b-12d3-a456-426614174000"
    }
  ]
}
```

---

### 技能版本

#### 创建新版本

**端点：** `POST /api/skills/:id/versions`

**认证：** 需要（仅作者）

**请求体：**
```json
{
  "version": "1.1.0",
  "changelog": "Added new features",
  "content": "Updated content..."
}
```

**响应：**
```json
{
  "data": {
    "id": "789e0123-e89b-12d3-a456-426614174000",
    "skill_id": "123e4567-e89b-12d3-a456-426614174000",
    "version": "1.1.0",
    "changelog": "Added new features",
    "content": "Updated content...",
    "created_at": "2026-03-09T08:00:00Z"
  }
}
```

---

#### 回滚版本

**端点：** `POST /api/skills/:id/versions/:version/rollback`

**认证：** 需要（仅作者）

**请求示例：**
```bash
curl -X POST "https://api.skillshub.example.com/api/skills/123e4567-e89b-12d3-a456-426614174000/versions/1.0.0/rollback" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**响应：**
```json
{
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "title": "My Skill",
    "version": "1.0.0",
    "content": "Original content...",
    "updated_at": "2026-03-09T09:00:00Z"
  }
}
```

---

### 评论管理

#### 获取评论列表

**端点：** `GET /api/skills/:skill_id/comments`

**查询参数：**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `page` | integer | 否 | 页码，默认 1 |
| `page_size` | integer | 否 | 每页数量，默认 20 |

**请求示例：**
```bash
curl -X GET "https://api.skillshub.example.com/api/skills/123e4567-e89b-12d3-a456-426614174000/comments?page=1"
```

**响应：**
```json
{
  "data": {
    "total": 10,
    "page": 1,
    "page_size": 20,
    "items": [
      {
        "id": "abc123",
        "skill_id": "123e4567-e89b-12d3-a456-426614174000",
        "user_id": "456e7890-e89b-12d3-a456-426614174000",
        "username": "commenter",
        "content": "Great skill!",
        "created_at": "2026-03-09T10:00:00Z"
      }
    ]
  }
}
```

---

#### 创建评论

**端点：** `POST /api/skills/:skill_id/comments`

**认证：** 需要

**请求体：**
```json
{
  "content": "Great skill!",
  "parent_id": "abc123"
}
```

**响应：**
```json
{
  "data": {
    "id": "def456",
    "skill_id": "123e4567-e89b-12d3-a456-426614174000",
    "user_id": "456e7890-e89b-12d3-a456-426614174000",
    "username": "commenter",
    "content": "Great skill!",
    "parent_id": "abc123",
    "created_at": "2026-03-09T11:00:00Z"
  }
}
```

---

#### 更新评论

**端点：** `PUT /api/comments/:comment_id`

**认证：** 需要（仅作者）

**请求体：**
```json
{
  "content": "Updated comment"
}
```

---

#### 删除评论

**端点：** `DELETE /api/comments/:comment_id`

**认证：** 需要（仅作者）

**响应：** `204 No Content`

---

### 收藏管理

#### 获取收藏列表

**端点：** `GET /api/favorites`

**认证：** 需要

**查询参数：**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `page` | integer | 否 | 页码，默认 1 |
| `page_size` | integer | 否 | 每页数量，默认 20 |

**请求示例：**
```bash
curl -X GET "https://api.skillshub.example.com/api/favorites?page=1" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**响应：**
```json
{
  "data": {
    "total": 5,
    "page": 1,
    "page_size": 20,
    "items": [
      {
        "id": "fav123",
        "skill_id": "123e4567-e89b-12d3-a456-426614174000",
        "skill_title": "AI Assistant",
        "skill_author": "myuser",
        "created_at": "2026-03-09T12:00:00Z"
      }
    ]
  }
}
```

---

#### 添加收藏

**端点：** `POST /api/skills/:id/favorite`

**认证：** 需要

**请求示例：**
```bash
curl -X POST "https://api.skillshub.example.com/api/skills/123e4567-e89b-12d3-a456-426614174000/favorite" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**响应：**
```json
{
  "data": {
    "id": "fav123",
    "user_id": "456e7890-e89b-12d3-a456-426614174000",
    "skill_id": "123e4567-e89b-12d3-a456-426614174000",
    "created_at": "2026-03-09T13:00:00Z"
  }
}
```

---

#### 取消收藏

**端点：** `DELETE /api/skills/:id/favorite`

**认证：** 需要

**请求示例：**
```bash
curl -X DELETE "https://api.skillshub.example.com/api/skills/123e4567-e89b-12d3-a456-426614174000/favorite" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**响应：** `204 No Content`

---

### 评分管理

#### 获取评分列表

**端点：** `GET /api/ratings`

**认证：** 需要

**查询参数：**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `page` | integer | 否 | 页码，默认 1 |
| `page_size` | integer | 否 | 每页数量，默认 20 |

---

#### 创建评分

**端点：** `POST /api/skills/:id/rating`

**认证：** 需要

**请求体：**
```json
{
  "rating": 5
}
```

**响应：**
```json
{
  "data": {
    "id": "rating123",
    "user_id": "456e7890-e89b-12d3-a456-426614174000",
    "skill_id": "123e4567-e89b-12d3-a456-426614174000",
    "rating": 5,
    "created_at": "2026-03-09T14:00:00Z"
  }
}
```

---

#### 更新评分

**端点：** `PUT /api/ratings/:id`

**认证：** 需要（仅作者）

**请求体：**
```json
{
  "rating": 4
}
```

---

#### 删除评分

**端点：** `DELETE /api/ratings/:id`

**认证：** 需要（仅作者）

**响应：** `204 No Content`

---

#### 获取评分统计

**端点：** `GET /api/skills/:id/ratings`

**请求示例：**
```bash
curl -X GET "https://api.skillshub.example.com/api/skills/123e4567-e89b-12d3-a456-426614174000/ratings"
```

**响应：**
```json
{
  "data": {
    "total_ratings": 10,
    "average_rating": 4.5,
    "distribution": {
      "1": 0,
      "2": 1,
      "3": 2,
      "4": 3,
      "5": 4
    }
  }
}
```

---

## 代码示例

### Python (requests)

```python
import requests

# 基础 URL
BASE_URL = "https://api.skillshub.example.com/api"

# 登录
def login(username, password):
    response = requests.post(f"{BASE_URL}/auth/login", json={
        "username": username,
        "password": password
    })
    data = response.json()
    return data["data"]["token"]

# 获取技能列表
def get_skills(page=1, page_size=20):
    response = requests.get(f"{BASE_URL}/skills", params={
        "page": page,
        "page_size": page_size
    })
    return response.json()

# 创建技能
def create_skill(token, skill_data):
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.post(f"{BASE_URL}/skills", json=skill_data, headers=headers)
    return response.json()

# 使用示例
token = login("myuser", "mypassword")
skills = get_skills()
print(skills)
```

---

### JavaScript (fetch)

```javascript
const BASE_URL = "https://api.skillshub.example.com/api";

// 登录
async function login(username, password) {
  const response = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username, password }),
  });
  const data = await response.json();
  return data.data.token;
}

// 获取技能列表
async function getSkills(page = 1, pageSize = 20) {
  const response = await fetch(
    `${BASE_URL}/skills?page=${page}&page_size=${pageSize}`
  );
  return await response.json();
}

// 创建技能
async function createSkill(token, skillData) {
  const response = await fetch(`${BASE_URL}/skills`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(skillData),
  });
  return await response.json();
}

// 使用示例
(async () => {
  const token = await login("myuser", "mypassword");
  const skills = await getSkills();
  console.log(skills);
})();
```

---

### JavaScript (Axios)

```javascript
import axios from "axios";

const BASE_URL = "https://api.skillshub.example.com/api";
const api = axios.create({ baseURL: BASE_URL });

// 登录
async function login(username, password) {
  const response = await api.post("/auth/login", { username, password });
  return response.data.data.token;
}

// 获取技能列表
async function getSkills(page = 1, pageSize = 20) {
  const response = await api.get("/skills", {
    params: { page, page_size: pageSize },
  });
  return response.data;
}

// 创建技能（需要认证）
async function createSkill(token, skillData) {
  const response = await api.post("/skills", skillData, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}

// 使用示例
(async () => {
  const token = await login("myuser", "mypassword");
  const skills = await getSkills();
  console.log(skills);
})();
```

---

## 最佳实践

### 1. 错误处理

始终检查响应状态并处理错误：

```python
def get_skills(page=1):
    response = requests.get(f"{BASE_URL}/skills", params={"page": page})
    
    if response.status_code == 200:
        return response.json()
    elif response.status_code == 401:
        raise Exception("未授权，请检查 Token")
    elif response.status_code == 404:
        raise Exception("资源不存在")
    else:
        raise Exception(f"请求失败: {response.status_code}")
```

---

### 2. Token 管理

- Token 有效期为 24 小时
- 在本地安全存储 Token
- 401 错误时自动重新登录

```python
class SkillShubClient:
    def __init__(self):
        self.token = None
    
    def login(self, username, password):
        self.token = login(username, password)
    
    def get_headers(self):
        if not self.token:
            raise Exception("请先登录")
        return {"Authorization": f"Bearer {self.token}"}
    
    def create_skill(self, skill_data):
        headers = self.get_headers()
        return create_skill(self.token, skill_data)
```

---

### 3. 分页处理

使用分页获取大量数据：

```python
def get_all_skills():
    page = 1
    all_skills = []
    
    while True:
        response = get_skills(page=page)
        skills = response["data"]["items"]
        
        if not skills:
            break
        
        all_skills.extend(skills)
        page += 1
    
    return all_skills
```

---

### 4. 请求重试

网络错误时自动重试：

```python
from time import sleep

def request_with_retry(func, max_retries=3, delay=1):
    for attempt in range(max_retries):
        try:
            return func()
        except requests.exceptions.RequestException as e:
            if attempt == max_retries - 1:
                raise
            sleep(delay)
```

---

### 5. 速率限制

- 避免短时间内发送大量请求
- 使用缓存减少重复请求
- 遵守 API 使用条款

---

### 6. 安全性

- 永远不要在客户端代码中硬编码密码
- 使用 HTTPS 保护所有请求
- 在服务器端验证敏感操作
- 定期更新 Token

---

## 📞 获取帮助

如果你遇到问题或需要帮助，可以：

1. **查阅本文档**：大多数问题都可以在本文档中找到答案
2. **查看错误码**：错误响应中的 `error_code` 可以帮助定位问题
3. **联系支持**：发送邮件到 api-support@skillshub.example.com
4. **提交反馈**：在 GitHub 上提交 Issue 或 PR

---

**祝你开发顺利！** 🚀
