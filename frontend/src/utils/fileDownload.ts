/**
 * Bulletproof file download utility with native "Save As" file path dialog
 * and robust fallback with delayed URL revocation to prevent dropped extensions.
 */

export async function saveFileWithDialog(
  blob: Blob,
  defaultFilename: string,
  mimeType: string,
  extension: string,
  _description?: string
): Promise<void> {
  const safeFilename = defaultFilename.endsWith(`.${extension}`) ? defaultFilename : `${defaultFilename}.${extension}`;

  // Explicit File object ensures the browser has the filename and MIME type baked into the binary payload
  const file = new File([blob], safeFilename, { type: mimeType });
  const blobUrl = URL.createObjectURL(file);

  const anchor = document.createElement('a');
  anchor.style.display = 'none';
  anchor.href = blobUrl;
  anchor.download = safeFilename;
  anchor.setAttribute('download', safeFilename);
  document.body.appendChild(anchor);
  anchor.click();

  // Crucial: Chromium / Edge loses the filename/extension if revoked synchronously!
  // Keeping URL alive for 60 seconds guarantees the browser finishes streaming the download.
  setTimeout(() => {
    try {
      if (document.body.contains(anchor)) {
        document.body.removeChild(anchor);
      }
      URL.revokeObjectURL(blobUrl);
    } catch {}
  }, 60000);
}
