import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsString, IsInt } from "class-validator";

export class UserProfileDto {
  @ApiProperty({ description: "昵称", required: false })
  @IsOptional()
  @IsString()
  nickname?: string;

  @ApiProperty({ description: "头像地址", required: false })
  @IsOptional()
  @IsString()
  avatar?: string;

  @ApiProperty({ description: "性别(1-男 2-女 0-保密)", required: false })
  @IsOptional()
  @IsInt()
  gender?: number;
}
