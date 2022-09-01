export function asInt(value: string, defaultValue: number): number {
  return value ? parseInt(value) : defaultValue;
}
