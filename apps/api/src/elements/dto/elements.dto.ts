import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  Min,
  MinLength,
  MaxLength,
} from 'class-validator';

export class CreateElementDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  uniqueName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  label?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  color!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  color2?: string | null;

  @IsOptional()
  @IsBoolean()
  isDualColor?: boolean;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  material!: string;

  @IsOptional()
  @IsString()
  rawMaterialId?: string | null;

  @IsNumber()
  @Min(0)
  weightGrams!: number;

  @IsOptional()
  @IsString()
  imageUrl?: string;
}

export class UpdateElementDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  uniqueName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  label?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  color?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  color2?: string | null;

  @IsOptional()
  @IsBoolean()
  isDualColor?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  material?: string;

  @IsOptional()
  @IsString()
  rawMaterialId?: string | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  weightGrams?: number;

  @IsOptional()
  @IsString()
  imageUrl?: string | null;
}
