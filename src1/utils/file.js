// Reads a small file (CV, document) into a base64 data URI client-side, the
// same convention already used for photos (compressImageFile) — no server
// upload endpoint exists, so this is how any file becomes a JSON-postable string.
export const readFileAsDataUri = (file, maxBytes = 700000) => {
  return new Promise((resolve, reject) => {
    if (file.size > maxBytes) {
      reject(new Error('FILE_TOO_LARGE'));
      return;
    }
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
};
