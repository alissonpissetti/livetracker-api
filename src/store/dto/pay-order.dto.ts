import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class IdentifyClientDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: '12345678909' })
  @IsString()
  @IsNotEmpty()
  cpf: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty()
  @IsEmail()
  email: string;
}

export class CreditCardDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  holderName: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  number: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  expiryMonth: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  expiryYear: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  ccv: string;
}

export class CreditCardHolderInfoDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  cpfCnpj: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  postalCode: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  addressNumber: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  addressComplement?: string | null;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  mobilePhone: string;
}

export class PayOrderDto {
  @ApiProperty({ enum: ['pix', 'creditCard'] })
  @IsIn(['pix', 'creditCard'])
  paymentMethod: 'pix' | 'creditCard';

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  installments?: number;

  @ApiPropertyOptional({ type: CreditCardDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreditCardDto)
  creditCard?: CreditCardDto;

  @ApiPropertyOptional({ type: CreditCardHolderInfoDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreditCardHolderInfoDto)
  creditCardHolderInfo?: CreditCardHolderInfoDto;
}
