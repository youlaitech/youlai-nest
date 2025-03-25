import { ApiProperty } from "@nestjs/swagger";

/**
 * 登录响应
 */
export class LoginResponse {
  @ApiProperty({ example: "00000" })
  code: string;
  @ApiProperty({ example: "eyJhbGciOiJ..." })
  data: string;
  @ApiProperty({ example: "请求成功" })
  msg: string;
}
