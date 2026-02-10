/**
 * Serialize Prisma results for safe transport.
 * Converts Prisma Decimal objects to plain numbers.
 */
export function serialize<T>(data: T): T {
  return JSON.parse(JSON.stringify(data, (_key, value) => {
    if (
      value !== null &&
      value !== undefined &&
      typeof value === 'object' &&
      typeof value.toNumber === 'function'
    ) {
      return value.toNumber();
    }
    return value;
  }));
}
