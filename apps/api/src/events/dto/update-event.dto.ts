import {
  IsArray,
  IsBoolean,
  IsISO8601,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

export class UpdateEventDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsBoolean()
  allDay?: boolean;

  @IsOptional()
  @IsISO8601()
  startAt?: string;

  @IsOptional()
  @IsISO8601()
  endAt?: string;

  /**
   * All-day events (preferred):
   * date-only string in YYYY-MM-DD, endDate exclusive.
   */
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  startDate?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  endDate?: string;

  @IsOptional()
  @IsString()
  timeZone?: string;

  @IsOptional()
  @IsString()
  color?: string;

  /**
   * Rule-only RRULE string (no "RRULE:" prefix). Use null to clear recurrence.
   */
  @IsOptional()
  @IsString()
  recurrenceRule?: string | null;

  @IsOptional()
  @IsString()
  recurrenceTimeZone?: string;

  @IsOptional()
  @IsArray()
  guests?: string[];

  @IsOptional()
  @IsArray()
  notifications?: Record<string, unknown>[];

  @IsOptional()
  @IsString()
  visibility?: string;

  @IsOptional()
  @IsString()
  busyStatus?: string;

  // Meeting-related
  @IsOptional()
  @IsBoolean()
  addMeeting?: boolean; // request to create meeting on save

  @IsOptional()
  @IsString()
  meetingProvider?: string;

  @IsOptional()
  @IsString()
  meetingUrl?: string;

  @IsOptional()
  meetingData?: Record<string, unknown>;

  // allow forcing regeneration of meeting URL (transient client-side flag)
  @IsOptional()
  @IsBoolean()
  regenerateMeeting?: boolean;
}
