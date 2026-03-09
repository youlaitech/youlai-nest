/**
 * Redis 缓存键常量定义
 *
 * 统一管理所有 Redis 键名，避免硬编码，便于维护和扩展
 */
export const RedisConstants = {
  /**
   * 系统模块缓存键
   */
  System: {
    /**
     * 角色权限映射缓存
     *
     * 数据结构：Hash
     * Key: system:role:perms
     * Field: 角色编码（roleCode）
     * Value: 权限标识集合（string[]）
     *
     * 示例：
     * - HGET system:role:perms "ADMIN" -> ["sys:user:add", "sys:user:edit", ...]
     * - HGET system:role:perms "OPERATOR" -> ["sys:user:view", ...]
     */
    ROLE_PERMS: "system:role:perms",
  },

  /**
   * 认证模块缓存键
   */
  Auth: {
    /**
     * 用户 Token 版本（用于失效历史 Token）
     */
    USER_TOKEN_VERSION: "auth:user:token_version",

    /**
     * 用户 JWT 会话
     */
    USER_JWT_SESSION: "auth:user:jwt_session",

    /**
     * Token 黑名单
     */
    TOKEN_BLACKLIST: "auth:token:blacklist",
  },
} as const;
