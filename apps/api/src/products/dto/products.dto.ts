import {
  IsString,
  IsOptional,
  IsInt,
  IsNumber,
  Min,
  MinLength,
  MaxLength,
} from 'class-validator';

export class CreateProductDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  serialNumber!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  category!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  label?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  unitsPerAssembly?: number;

  @IsInt()
  @Min(1)
  unitsPerBox!: number;

  @IsOptional()
  @IsString()
  boxRawMaterialId?: string | null;

  @IsString()
  imageUrl!: string;
}

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  serialNumber?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  category?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  label?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  unitsPerBox?: number;

  @IsOptional()
  @IsString()
  boxRawMaterialId?: string | null;

  @IsOptional()
  @IsString()
  imageUrl?: string;
}

export class CloneProductDto {
  @IsString()
  @MinLength(1)
  sourceProductId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  newSerialNumber!: string;
}

export class AddProductElementDto {
  @IsString()
  @MinLength(1)
  productId!: string;

  @IsString()
  @MinLength(1)
  elementId!: string;

  @IsInt()
  @Min(1)
  quantityNeeded!: number;
}
