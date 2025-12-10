export const utilService = {
  removeEmptyObjectFields,
  buildSortObject,
};

export function removeEmptyObjectFields(obj) {
  return Object.fromEntries(
    Object.entries(obj).filter(
      ([key, value]) => value !== null && value !== undefined
    )
  );
}

function buildSortObject(sortBy, sortDir) {
  if (!sortBy) return { sort: {} };
  return { sort: { [sortBy]: sortDir } };
}
