export const utilService = {
  removeEmptyObjectFields,
};

function removeEmptyObjectFields(obj) {
  return Object.fromEntries(
    Object.entries(obj).filter(
      ([key, value]) => value !== null && value !== undefined
    )
  );
}
