import { ApiProperty } from "@nestjs/swagger";

export class LoginResponse {
  @ApiProperty({ example: "00000" })
  code: string;
  @ApiProperty({ example: "eyJhbGciOiJ..." })
  data: string;
  @ApiProperty({ example: "请求成功" })
  msg: string;
}
