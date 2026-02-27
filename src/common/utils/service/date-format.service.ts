import { Injectable } from "@nestjs/common";

@Injectable()
export class DateFormatService {
  static defaultPattern = "YYYY-MM-DD HH:mm:ss";
  static defaultTimezone = 8;

  static format(
    date: Date,
    options?: {
      pattern?: string;
      timezone?: number;
      keepOriginal?: boolean;
    }
  ) {
    if (!date) return null;

    if (options?.keepOriginal) return date.toISOString();

    const pattern = options?.pattern || this.defaultPattern;
    const tz = options?.timezone ?? this.defaultTimezone;

    const d = new Date(date);
    d.setUTCHours(d.getUTCHours() + tz);

    return pattern
      .replace("YYYY", d.getUTCFullYear().toString())
      .replace("MM", (d.getUTCMonth() + 1).toString().padStart(2, "0"))
      .replace("DD", d.getUTCDate().toString().padStart(2, "0"))
      .replace("HH", d.getUTCHours().toString().padStart(2, "0"))
      .replace("mm", d.getUTCMinutes().toString().padStart(2, "0"))
      .replace("ss", d.getUTCSeconds().toString().padStart(2, "0"));
  }
}
