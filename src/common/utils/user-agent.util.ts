/**
 * 解析 User-Agent 字符串，返回浏览器和操作系统信息
 */
export function parseUserAgent(ua: string): { browser: string; os: string } {
  if (!ua) return { browser: "", os: "" };

  let browser = "";
  let os = "";

  // 操作系统检测
  if (ua.includes("Windows NT 10")) os = "Windows 10";
  else if (ua.includes("Windows NT 6.3")) os = "Windows 8.1";
  else if (ua.includes("Windows NT 6.1")) os = "Windows 7";
  else if (ua.includes("Windows")) os = "Windows";
  else if (ua.includes("Mac OS X")) {
    const match = ua.match(/Mac OS X ([\d_]+)/);
    os = match ? `macOS ${match[1].replace(/_/g, ".")}` : "macOS";
  } else if (ua.includes("Android")) {
    const match = ua.match(/Android ([\d.]+)/);
    os = match ? `Android ${match[1]}` : "Android";
  } else if (ua.includes("iPhone") || ua.includes("iPad")) {
    const match = ua.match(/OS ([\d_]+)/);
    os = match ? `iOS ${match[1].replace(/_/g, ".")}` : "iOS";
  } else if (ua.includes("Linux")) os = "Linux";

  // 浏览器检测（顺序重要：Edge 需在 Chrome 之前检测）
  if (ua.includes("Edg/")) {
    const match = ua.match(/Edg\/([\d.]+)/);
    browser = match ? `Edge ${match[1]}` : "Edge";
  } else if (ua.includes("OPR/") || ua.includes("Opera/")) {
    const match = ua.match(/(?:OPR|Opera)\/([\d.]+)/);
    browser = match ? `Opera ${match[1]}` : "Opera";
  } else if (ua.includes("Firefox/")) {
    const match = ua.match(/Firefox\/([\d.]+)/);
    browser = match ? `Firefox ${match[1]}` : "Firefox";
  } else if (ua.includes("Chrome/") && !ua.includes("Edg/")) {
    const match = ua.match(/Chrome\/([\d.]+)/);
    browser = match ? `Chrome ${match[1]}` : "Chrome";
  } else if (ua.includes("Safari/") && !ua.includes("Chrome")) {
    const match = ua.match(/Version\/([\d.]+)/);
    browser = match ? `Safari ${match[1]}` : "Safari";
  } else if (ua.includes("MSIE") || ua.includes("Trident/")) {
    browser = "IE";
  }

  return { browser, os };
}
