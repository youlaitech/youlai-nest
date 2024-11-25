import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsEnum } from 'class-validator';
import { TagType } from '../schemas/dict.schemas';

export class CreateDictDataDto {
  @ApiProperty({ description: '字典编码' })
  @IsString()
  dictCode: string;

  @ApiProperty({ description: '字典标签' })
  @IsString()
  label: string;

  @ApiProperty({ description: '字典值' })
  @IsString()
  value: string;

  @ApiProperty({ description: '排序' })
  @IsNumber()
  sort: number;

  @ApiProperty({ description: '状态' })
  @IsNumber()
  status: number;

  @ApiProperty({ description: '标签类型' })
  @IsEnum(TagType)
  tagType: TagType;

  @ApiProperty({ description: '创建人' })
  @IsString()
  createBy?: string;

  @ApiProperty({ description: '创建时间' })
  @IsNumber()
  createTime?: number;
  deptTreePath: string;
}
