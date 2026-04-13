export type AppErrorCode =
  | 'INVALID_CREDENTIALS'
  | 'INVALID_EMAIL'
  | 'INVALID_USERNAME'
  | 'INVALID_PASSWORD'
  | 'INVALID_USER_ID'
  | 'INVALID_SKILL_TITLE'
  | 'INVALID_SKILL_CONTENT'
  | 'INVALID_VERSION'
  | 'INVALID_VERSION_CONTENT'
  | 'INVALID_RATING_VALUE'
  | 'INVALID_COMMENT_CONTENT'
  | 'INVALID_MULTIPART_FIELD'
  | 'INVALID_ADMIN_OPERATION'
  | 'EMPTY_UPDATE_PAYLOAD'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'RESOURCE_NOT_FOUND'
  | 'SKILL_NOT_FOUND'
  | 'ARCHIVE_REQUIRED'
  | 'ARCHIVE_INVALID'
  | 'ARCHIVE_MISSING_SKILL_MD'
  | 'RESOURCE_ALREADY_EXISTS'
  | 'DATABASE_ERROR'
  | 'INTERNAL_ERROR'
  | 'REFERENCED_RESOURCE_NOT_FOUND';

const messages = {
  'zh-CN': {
    INVALID_CREDENTIALS: '用户名或密码错误。',
    INVALID_EMAIL: '请输入有效的邮箱地址。',
    INVALID_USERNAME: '用户名长度需在 3 到 50 个字符之间。',
    INVALID_PASSWORD: '密码长度不能少于 6 个字符。',
    INVALID_USER_ID: '用户信息无效，请重新登录。',
    INVALID_SKILL_TITLE: '技能标题不能为空。',
    INVALID_SKILL_CONTENT: '技能内容不能为空。',
    INVALID_VERSION: '版本号不能为空。',
    INVALID_VERSION_CONTENT: '版本内容不能为空。',
    INVALID_RATING_VALUE: '评分必须在 1 到 5 之间。',
    INVALID_COMMENT_CONTENT: '评论内容不能为空。',
    INVALID_MULTIPART_FIELD: '上传字段无效。',
    INVALID_ADMIN_OPERATION: '该管理员操作无效。',
    EMPTY_UPDATE_PAYLOAD: '没有可更新的字段。',
    UNAUTHORIZED: '请先登录。',
    FORBIDDEN: '没有执行该操作的权限。',
    RESOURCE_NOT_FOUND: '资源不存在。',
    SKILL_NOT_FOUND: '技能不存在。',
    ARCHIVE_REQUIRED: '请先上传技能 ZIP 包。',
    ARCHIVE_INVALID: '请上传有效的 ZIP 压缩包。',
    ARCHIVE_MISSING_SKILL_MD: 'ZIP 包内必须包含 SKILL.md。',
    RESOURCE_ALREADY_EXISTS: '资源已存在。',
    DATABASE_ERROR: '数据处理失败，请稍后重试。',
    INTERNAL_ERROR: '服务器开小差了，请稍后重试。',
    REFERENCED_RESOURCE_NOT_FOUND: '关联资源不存在。',
  },
  'en-US': {
    INVALID_CREDENTIALS: 'Invalid username or password.',
    INVALID_EMAIL: 'Please enter a valid email address.',
    INVALID_USERNAME: 'Username must be between 3 and 50 characters.',
    INVALID_PASSWORD: 'Password must be at least 6 characters.',
    INVALID_USER_ID: 'Invalid user context. Please sign in again.',
    INVALID_SKILL_TITLE: 'Skill title is required.',
    INVALID_SKILL_CONTENT: 'Skill content is required.',
    INVALID_VERSION: 'Version number is required.',
    INVALID_VERSION_CONTENT: 'Version content is required.',
    INVALID_RATING_VALUE: 'Rating must be between 1 and 5.',
    INVALID_COMMENT_CONTENT: 'Comment content is required.',
    INVALID_MULTIPART_FIELD: 'Invalid multipart field.',
    INVALID_ADMIN_OPERATION: 'Invalid administrator operation.',
    EMPTY_UPDATE_PAYLOAD: 'No fields to update.',
    UNAUTHORIZED: 'Please sign in first.',
    FORBIDDEN: 'You do not have permission to perform this action.',
    RESOURCE_NOT_FOUND: 'Resource not found.',
    SKILL_NOT_FOUND: 'Skill not found.',
    ARCHIVE_REQUIRED: 'Please upload a ZIP package first.',
    ARCHIVE_INVALID: 'Please upload a valid ZIP archive.',
    ARCHIVE_MISSING_SKILL_MD: 'The ZIP package must include SKILL.md.',
    RESOURCE_ALREADY_EXISTS: 'Resource already exists.',
    DATABASE_ERROR: 'Data processing failed. Please try again later.',
    INTERNAL_ERROR: 'Server error. Please try again later.',
    REFERENCED_RESOURCE_NOT_FOUND: 'Referenced resource does not exist.',
  },
} as const;

export function translateErrorCode(code?: string | null, locale?: string | null) {
  if (!code) return null;
  const lang = locale?.toLowerCase().startsWith('en') ? 'en-US' : 'zh-CN';
  return messages[lang][code as AppErrorCode] ?? null;
}