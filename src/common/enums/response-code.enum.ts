/**
 * 响应码枚举
 *
 * 参考阿里巴巴开发手册响应码规范
 * 00000 正常
 * A**** 用户端错误
 * B**** 系统执行出错
 * C**** 调用第三方服务出错
 */

import { HttpStatus } from "@nestjs/common";

export const ResponseCode = {
  /* 成功状态 */
  SUCCESS: { code: "00000", msg: "一切ok", httpStatus: HttpStatus.OK },

  /* 一级错误码 */
  USER_ERROR: { code: "A0001", msg: "用户端错误", httpStatus: HttpStatus.BAD_REQUEST },

  /* 用户名相关错误 */
  USERNAME_VERIFICATION_FAILED: {
    code: "A0110",
    msg: "用户名校验失败",
    httpStatus: HttpStatus.BAD_REQUEST,
  },
  USERNAME_ALREADY_EXISTS: { code: "A0111", msg: "用户名已存在" },
  USERNAME_SENSITIVE_WORDS: { code: "A0112", msg: "用户名包含敏感词" },
  USERNAME_SPECIAL_CHARACTERS: { code: "A0113", msg: "用户名包含特殊字符" },

  /* 密码相关错误 */
  PASSWORD_VERIFICATION_FAILED: { code: "A0120", msg: "密码校验失败" },
  PASSWORD_LENGTH_INVALID: { code: "A0121", msg: "密码长度不够" },
  PASSWORD_STRENGTH_INVALID: { code: "A0122", msg: "密码强度不够" },

  /* 登录相关错误 */
  USER_LOGIN_EXCEPTION: { code: "A0200", msg: "用户登录异常" },
  USER_ACCOUNT_FROZEN: { code: "A0201", msg: "用户账户被冻结" },
  USER_ACCOUNT_ABOLISHED: { code: "A0202", msg: "用户账户已作废" },
  USER_LOGIN_CREDENTIALS_INVALID: {
    code: "A0210",
    msg: "用户名或密码错误",
    httpStatus: HttpStatus.UNAUTHORIZED,
  },
  USER_LOGIN_RETRY_LIMIT: {
    code: "A0211",
    msg: "用户输入密码错误次数超限",
    httpStatus: HttpStatus.UNAUTHORIZED,
  },

  USER_NOT_FOUND: {
    code: "A0212",
    msg: "用户不存在",
    httpStatus: HttpStatus.NOT_FOUND,
  },

  /* Token相关错误 */
  ACCESS_TOKEN_INVALID: {
    code: "A0230",
    msg: "访问令牌无效或已过期",
    httpStatus: HttpStatus.UNAUTHORIZED,
  },
  REFRESH_TOKEN_INVALID: {
    code: "A0231",
    msg: "刷新令牌无效或已过期",
    httpStatus: HttpStatus.UNAUTHORIZED,
  },

  /* 验证码错误 */
  VERIFICATION_CODE_ERROR: {
    code: "A0240",
    msg: "验证码错误",
    httpStatus: HttpStatus.BAD_REQUEST,
  },
  VERIFICATION_CODE_ATTEMPT_LIMIT: {
    code: "A0241",
    msg: "用户验证码尝试次数超限",
    httpStatus: HttpStatus.BAD_REQUEST,
  },
  VERIFICATION_CODE_EXPIRED: {
    code: "A0242",
    msg: "用户验证码过期",
    httpStatus: HttpStatus.BAD_REQUEST,
  },

  /* 访问权限错误 */
  ACCESS_PERMISSION_EXCEPTION: {
    code: "A0300",
    msg: "访问权限异常",
    httpStatus: HttpStatus.FORBIDDEN,
  },
  ACCESS_UNAUTHORIZED: { code: "A0301", msg: "访问未授权", httpStatus: HttpStatus.UNAUTHORIZED },

  /* 系统错误 */
  SYSTEM_ERROR: { code: "B0001", msg: "系统执行出错" },

  /* 第三方服务错误 */
  THIRD_PARTY_ERROR: { code: "C0001", msg: "调用第三方服务出错" },
} as const;
