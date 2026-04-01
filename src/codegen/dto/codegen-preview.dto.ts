export interface CodegenPreviewDto {
  path: string;
  fileName: string;
  content: string;
  scope: "frontend" | "backend";
  language: string;
}
