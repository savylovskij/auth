let counter = 0;

export function uniqueEmail(prefix = 'user'): string {
  counter += 1;

  return `${prefix}-${Date.now()}-${counter}@example.test`;
}
