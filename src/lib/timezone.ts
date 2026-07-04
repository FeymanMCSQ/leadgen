export function getLocalDate(timezone: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(new Date());
}

export function getAppTimezone(): string {
  return process.env.APP_TIMEZONE ?? 'Australia/Sydney';
}
