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

    /**
     * 扫码登录票据 Key 前缀，完整 Key 为 auth:qr_code:{ticket}
     */
    QR_CODE: "auth:qr_code",
  },
} as const;
