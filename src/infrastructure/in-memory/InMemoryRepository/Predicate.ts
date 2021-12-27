export type Predicate<T> = (value: T) => boolean;

const compact = <T>(array: ReadonlyArray<T | null>): ReadonlyArray<T> =>
  array.filter(item => !!item) as ReadonlyArray<T>;

export const unionPredicates = <T>(
  predicatesOrNull: ReadonlyArray<Predicate<T> | null>,
): Predicate<T> => {
  const predicates = compact(predicatesOrNull);
  if (predicates.length === 0) return () => true;

  return value =>
    predicates.reduce<boolean>(
      (current, predicate) => current || predicate(value),
      false,
    );
};

export const intersectPredicates =
  <T>(predicatesOrNull: ReadonlyArray<Predicate<T> | null>): Predicate<T> =>
  value =>
    compact(predicatesOrNull).reduce<boolean>(
      (current, predicate) => current && predicate(value),
      true,
    );
