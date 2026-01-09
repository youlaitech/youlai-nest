import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

export class UserProfileDto {
  @ApiProperty({ description: "昵称", required: false })
  @IsOptional()
  @IsString()
  nickname?: string;

  @ApiProperty({ description: "手机号", required: false })
  @IsOptional()
  @IsString()
  mobile?: string;

  @ApiProperty({ description: "邮箱", required: false })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiProperty({ description: "头像地址", required: false })
  @IsOptional()
  @IsString()
  avatar?: string;
}



