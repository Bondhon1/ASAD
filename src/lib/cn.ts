export function cn(
  ...classes: Array<string | number | boolean | undefined | null>
): string {
  return classes.filter(Boolean).join(" ");
}
