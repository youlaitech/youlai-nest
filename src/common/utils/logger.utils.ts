import type { Request, Response } from "express";
import type { IncomingHttpHeaders } from "http";

interface RequestLogContext {
  url: string;
  method: string;
  clientIP: string;
  userAgent?: string;
  referrer?: string;
  params: Record<string, unknown>;
  query: Record<string, unknown>;
  headers: IncomingHttpHeaders;
  body: Record<string, unknown>;
}

interface ResponseLogContext {
  statusCode: number;
  latency: number;
  contentLength?: number;
}

// 日志脱敏：请求头与请求体中的凭据、验证码不落盘
const SENSITIVE_HEADERS = ["authorization", "cookie", "set-cookie"];
const SENSITIVE_FIELDS = [
  "password",
  "oldpassword",
  "newpassword",
  "confirmpassword",
  "token",
  "accesstoken",
  "refreshtoken",
  "captchacode",
  "smscode",
  "code",
  "x-api-key",
];

export function maskBody(body: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!body || typeof body !== "object") return {};
  const masked: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    if (SENSITIVE_FIELDS.includes(key.toLowerCase())) {
      masked[key] = "***";
    } else if (value instanceof Date) {
      masked[key] = value;
    } else if (Array.isArray(value)) {
      masked[key] = value.map((item) =>
        item && typeof item === "object" && !(item instanceof Date)
          ? maskBody(item as Record<string, unknown>)
          : item
      );
    } else if (value && typeof value === "object") {
      masked[key] = maskBody(value as Record<string, unknown>);
    } else {
      masked[key] = value;
    }
  }
  return masked;
}

function maskHeaders(headers: IncomingHttpHeaders): IncomingHttpHeaders {
  const masked = { ...headers };
  for (const key of SENSITIVE_HEADERS) {
    if (key in masked) masked[key] = "***";
  }
  return masked;
}

export class LoggerUtils {
  static captureRequestContext(req: Request): RequestLogContext {
    return {
      url: req.originalUrl,
      method: req.method,
      clientIP: this.parseClientIP(req),
      userAgent: req.headers["user-agent"],
      referrer: req.headers.referer,
      params: req.params as Record<string, unknown>,
      query: req.query as Record<string, unknown>,
      headers: maskHeaders(req.headers),
      body: maskBody(req.body as Record<string, unknown>),
    };
  }

  static captureResponseContext(res: Response, startTime: number): ResponseLogContext {
    return {
      statusCode: res.statusCode,
      latency: Date.now() - startTime,
      contentLength: res.getHeader("content-length") as number,
    };
  }

  static parseClientIP(req: Request): string {
    return (
      req.ip || req.socket?.remoteAddress || req.headers["x-forwarded-for"]?.toString() || "unknown"
    );
  }
}
