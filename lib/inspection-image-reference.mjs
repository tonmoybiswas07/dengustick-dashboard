export const maxInspectionImages = 10;
export const maxInspectionImageBytes = 4 * 1024 * 1024;
export const inspectionImagePath = /^\/api\/inspection-images\/([a-f0-9]{24})$/;

/** @param {string} value */
export function inspectionImageId(value) {
  return inspectionImagePath.exec(value)?.[1];
}
