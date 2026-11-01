/**
 * 在线用户信息，用于 SSE 在线连接统计
 */
export interface OnlineUserDto {
  /** 用户名 */
  username: string;

  /** 会话数量（多设备登录时大于1） */
  sessionCount: number;

  /** 最早登录时间 */
  loginTime: number;
}
