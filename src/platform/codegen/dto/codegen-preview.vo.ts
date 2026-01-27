export interface CodegenPreviewVo {
  path: string;
  fileName: string;
  content: string;
  scope: "frontend" | "backend";
  language: string;
}
