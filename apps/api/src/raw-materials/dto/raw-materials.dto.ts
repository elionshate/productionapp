import { IsString, IsOptional, IsNumber, MinLength, MaxLength } from 'class-validator';

export class CreateRawMaterialDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(50)
  unit!: string;
}

export class UpdateRawMaterialDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  unit?: string;
}

export class AdjustRawMaterialDto {
  @IsString()
  @MinLength(1)
  rawMaterialId!: string;

  @IsNumber()
  changeAmount!: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
