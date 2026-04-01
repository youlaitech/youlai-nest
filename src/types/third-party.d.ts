declare module "velocityjs" {
  export function render(template: string, context: any, macro?: any): string;
}

declare module "jszip" {
  export default class JSZip {
    file(path: string, data: any): JSZip;
    generateAsync(options: any): Promise<any>;
  }
}
