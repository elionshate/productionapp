import { IsString, IsInt, MinLength, MaxLength } from 'class-validator';

export class AdjustInventoryDto {
  @IsString()
  @MinLength(1)
  elementId!: string;

  @IsInt()
  changeAmount!: number;

  @IsString()
  @MinLength(1)
  @MaxLength(500)
  reason!: string;
}
