export const utilService = {
  removeEmptyObjectFields,
  getObjTimestamp,
};

export function removeEmptyObjectFields(obj) {
  return Object.fromEntries(
    Object.entries(obj).filter(
      ([key, value]) => value !== null && value !== undefined
    )
  );
}

// Helper function to get the createdAt timestamp from an object's ID and converting it from UTC to Israel timezone
export function getObjTimestamp(obj) {
  const utcDate = obj._id.getTimestamp();
  const israelDate = new Date(
    utcDate.toLocaleString('en-US', { timeZone: 'Asia/Jerusalem' })
  );
  return israelDate;
}
