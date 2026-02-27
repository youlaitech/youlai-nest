/**
 * 响应码枚举
 * 00000 正常
 * A**** 用户端错误
 * B**** 系统执行出错
 * C**** 调用第三方服务出错
 */

import { HttpStatus } from "@nestjs/common";

export const ErrorCode = {
  SUCCESS: { code: "00000", msg: "成功", httpStatus: HttpStatus.OK },

  USER_ERROR: { code: "A0001", msg: "用户端错误", httpStatus: HttpStatus.BAD_REQUEST },

  USER_REGISTRATION_ERROR: {
    code: "A0100",
    msg: "用户注册错误",
    httpStatus: HttpStatus.BAD_REQUEST,
  },
  USER_NOT_AGREE_PRIVACY_AGREEMENT: {
    code: "A0101",
    msg: "用户未同意隐私协议",
    httpStatus: HttpStatus.BAD_REQUEST,
  },
  VERIFICATION_CODE_INPUT_ERROR: {
    code: "A0130",
    msg: "校验码输入错误",
    httpStatus: HttpStatus.BAD_REQUEST,
  },

  USER_LOGIN_EXCEPTION: { code: "A0200", msg: "用户登录异常", httpStatus: HttpStatus.BAD_REQUEST },
  ACCOUNT_NOT_FOUND: { code: "A0201", msg: "用户账户不存在", httpStatus: HttpStatus.BAD_REQUEST },
  ACCOUNT_FROZEN: { code: "A0202", msg: "用户账户被冻结", httpStatus: HttpStatus.BAD_REQUEST },
  USER_PASSWORD_ERROR: {
    code: "A0210",
    msg: "用户名或密码错误",
    httpStatus: HttpStatus.BAD_REQUEST,
  },

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

  USER_VERIFICATION_CODE_ERROR: {
    code: "A0240",
    msg: "验证码错误",
    httpStatus: HttpStatus.BAD_REQUEST,
  },
  USER_VERIFICATION_CODE_ATTEMPT_LIMIT_EXCEEDED: {
    code: "A0241",
    msg: "用户验证码尝试次数超限",
    httpStatus: HttpStatus.BAD_REQUEST,
  },
  USER_VERIFICATION_CODE_EXPIRED: {
    code: "A0242",
    msg: "用户验证码过期",
    httpStatus: HttpStatus.BAD_REQUEST,
  },

  ACCESS_PERMISSION_EXCEPTION: {
    code: "A0300",
    msg: "访问权限异常",
    httpStatus: HttpStatus.BAD_REQUEST,
  },
  ACCESS_UNAUTHORIZED: { code: "A0301", msg: "访问未授权", httpStatus: HttpStatus.UNAUTHORIZED },

  USER_REQUEST_PARAMETER_ERROR: {
    code: "A0400",
    msg: "用户请求参数错误",
    httpStatus: HttpStatus.BAD_REQUEST,
  },
  INVALID_USER_INPUT: { code: "A0402", msg: "无效的用户输入", httpStatus: HttpStatus.BAD_REQUEST },
  REQUEST_REQUIRED_PARAMETER_IS_EMPTY: {
    code: "A0410",
    msg: "请求必填参数为空",
    httpStatus: HttpStatus.BAD_REQUEST,
  },
  PARAMETER_FORMAT_MISMATCH: {
    code: "A0421",
    msg: "参数格式不匹配",
    httpStatus: HttpStatus.BAD_REQUEST,
  },

  USER_REQUEST_SERVICE_EXCEPTION: {
    code: "A0500",
    msg: "用户请求服务异常",
    httpStatus: HttpStatus.BAD_REQUEST,
  },
  REQUEST_CONCURRENCY_LIMIT_EXCEEDED: {
    code: "A0502",
    msg: "请求并发数超出限制",
    httpStatus: HttpStatus.BAD_REQUEST,
  },
  DUPLICATE_SUBMISSION: { code: "A0506", msg: "请勿重复提交", httpStatus: HttpStatus.BAD_REQUEST },

  UPLOAD_FILE_EXCEPTION: { code: "A0700", msg: "上传文件异常", httpStatus: HttpStatus.BAD_REQUEST },
  DELETE_FILE_EXCEPTION: { code: "A0710", msg: "删除文件异常", httpStatus: HttpStatus.BAD_REQUEST },

  SYSTEM_ERROR: { code: "B0001", msg: "系统执行出错", httpStatus: HttpStatus.BAD_REQUEST },
  SYSTEM_EXECUTION_TIMEOUT: {
    code: "B0100",
    msg: "系统执行超时",
    httpStatus: HttpStatus.BAD_REQUEST,
  },

  THIRD_PARTY_SERVICE_ERROR: {
    code: "C0001",
    msg: "调用第三方服务出错",
    httpStatus: HttpStatus.BAD_REQUEST,
  },
  INTERFACE_NOT_EXIST: { code: "C0113", msg: "接口不存在", httpStatus: HttpStatus.NOT_FOUND },
  DATABASE_SERVICE_ERROR: {
    code: "C0300",
    msg: "数据库服务出错",
    httpStatus: HttpStatus.BAD_REQUEST,
  },
  DATABASE_EXECUTION_SYNTAX_ERROR: {
    code: "C0313",
    msg: "数据库执行语法错误",
    httpStatus: HttpStatus.BAD_REQUEST,
  },
  INTEGRITY_CONSTRAINT_VIOLATION: {
    code: "C0342",
    msg: "违反了完整性约束",
    httpStatus: HttpStatus.BAD_REQUEST,
  },
  DATABASE_ACCESS_DENIED: {
    code: "C0351",
    msg: "当前环境禁止数据库写入",
    httpStatus: HttpStatus.BAD_REQUEST,
  },
} as const;
