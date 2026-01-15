import { ApiProperty } from "@nestjs/swagger";
import { IsObject, IsOptional, IsString } from "class-validator";

export class AiFunctionCallDto {
  @ApiProperty({ description: "函数名称" })
  @IsString()
  name: string;

  @ApiProperty({ description: "函数描述", required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: "函数参数" })
  @IsObject()
  arguments: Record<string, any>;
}
