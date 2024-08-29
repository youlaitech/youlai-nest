import { Request } from 'express';

export const getReqMainInfo: (req: Request) => {
  [prop: string]: any;
} = (req) => {
  const { query, headers, url, method, body, connection } = req;

  // 获取 IP
  const xRealIp = headers['X-Real-IP'];
  //  真实ip 参考地址 https://cloud.tencent.com/developer/article/1908285
  // const aa: string = headers['HTTP_CLIENT_ip'];
  const xForwardedFor = headers['X-Forwarded-For'];
  const { ip: cIp } = req;
  const { remoteAddress } = connection || {};
  const ip = xRealIp || xForwardedFor || cIp || remoteAddress;

  return {
    url,
    host: headers.host,
    ip,
    method,
    query,
    body,
  };
};
