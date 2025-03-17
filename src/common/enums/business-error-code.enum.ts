/**
 * 业务错误码枚举
 * 错误码设计：
 * - 1xxxx: 用户相关错误
 * - 2xxxx: 权限相关错误
 * - 3xxxx: 数据库相关错误
 * - 4xxxx: 缓存相关错误
 * - 5xxxx: 第三方服务相关错误
 * - 6xxxx: 业务逻辑相关错误
 */
export enum BusinessErrorCode {
  // 成功
  SUCCESS = 200,

  // 用户相关错误 (1xxxx)
  USER_NOT_FOUND = 10001, // 用户不存在
  USER_ALREADY_EXISTS = 10002, // 用户已存在
  USER_PASSWORD_ERROR = 10003, // 密码错误
  USER_ACCOUNT_DISABLED = 10004, // 账号已禁用
  USER_ACCOUNT_LOCKED = 10005, // 账号已锁定
  USER_TOKEN_EXPIRED = 10006, // 用户令牌过期
  USER_TOKEN_INVALID = 10007, // 用户令牌无效
  USER_LOGIN_EXPIRED = 10008, // 登录已过期
  USER_UNAUTHORIZED = 10009, // 用户未授权
  USER_DELETE_ERROR = 10010, // 用户删除失败

  // 权限相关错误 (2xxxx)
  PERMISSION_DENIED = 20001, // 权限不足
  ROLE_NOT_FOUND = 20002, // 角色不存在
  ROLE_ALREADY_EXISTS = 20003, // 角色已存在
  MENU_NOT_FOUND = 20004, // 菜单不存在
  MENU_ALREADY_EXISTS = 20005, // 菜单已存在
  RESOURCE_ACCESS_DENIED = 20006, // 资源访问被拒绝

  // 数据库相关错误 (3xxxx)
  DB_CONNECTION_ERROR = 30001, // 数据库连接错误
  DB_QUERY_ERROR = 30002, // 数据库查询错误
  DB_UPDATE_ERROR = 30003, // 数据库更新错误
  DB_DELETE_ERROR = 30004, // 数据库删除错误
  DB_DUPLICATE_KEY = 30005, // 唯一键冲突
  DB_TRANSACTION_ERROR = 30006, // 事务处理错误
  DB_VALIDATION_ERROR = 30007, // 数据验证错误

  // 缓存相关错误 (4xxxx)
  CACHE_CONNECTION_ERROR = 40001, // 缓存连接错误
  CACHE_SET_ERROR = 40002, // 缓存设置错误
  CACHE_GET_ERROR = 40003, // 缓存获取错误
  CACHE_DELETE_ERROR = 40004, // 缓存删除错误
  CACHE_EXPIRED = 40005, // 缓存已过期

  // 第三方服务相关错误 (5xxxx)
  EXTERNAL_SERVICE_ERROR = 50001, // 外部服务调用错误
  API_REQUEST_ERROR = 50002, // API请求错误
  OSS_UPLOAD_ERROR = 50003, // OSS上传错误
  OSS_DOWNLOAD_ERROR = 50004, // OSS下载错误
  SMS_SEND_ERROR = 50005, // 短信发送错误

  // 业务逻辑相关错误 (6xxxx)
  VALIDATION_ERROR = 60001, // 数据验证错误
  BUSINESS_ERROR = 60002, // 业务处理错误
  OPERATION_FAILED = 60003, // 操作失败
  PARAM_ERROR = 60004, // 参数错误
  STATE_ERROR = 60005, // 状态错误
}
