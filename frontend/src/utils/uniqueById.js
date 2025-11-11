// frontend/src/utils/uniqueById.js
export function uniqueById(arr) {
  const map = new Map();
  for (const item of arr) {
    if (item && item.id != null) {
      map.set(item.id, item);
    }
  }
  return [...map.values()];
}
