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
      headers: req.headers,
      body: req.body as Record<string, unknown>,
    };
  }

  static captureResponseContext(res: Response, startTime: number): ResponseLogContext {
    return {
      statusCode: res.statusCode,
      latency: Date.now() - startTime,
      contentLength: res.getHeader("content-length") as number,
    };
  }

  private static parseClientIP(req: Request): string {
    return (
      req.ip || req.socket?.remoteAddress || req.headers["x-forwarded-for"]?.toString() || "unknown"
    );
  }
}
