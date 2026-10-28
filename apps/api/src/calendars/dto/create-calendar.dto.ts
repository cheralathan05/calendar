import { IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class CreateCalendarDto {
  @IsString()
  @MinLength(1)
  name!: string;

  /** Hex color e.g. "#039BE5". Optional — defaults to a system color. */
  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: 'color must be a valid hex color e.g. #039BE5',
  })
  color?: string;
}
