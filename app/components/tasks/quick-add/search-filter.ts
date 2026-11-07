export function matchesSearchQuery(value: string, query: string): boolean {
  const normalizedQuery = query.trim().toLowerCase();

  return (
    normalizedQuery.length === 0 ||
    value.toLowerCase().includes(normalizedQuery)
  );
}
