/**
 * Bulletproof file download utility with native "Save As" file path dialog
 * and robust fallback with delayed URL revocation to prevent dropped extensions.
 */

export async function saveFileWithDialog(
  blob: Blob,
  defaultFilename: string,
  mimeType: string,
  extension: string,
  description: string
): Promise<void> {
  const safeFilename = defaultFilename.endsWith(`.${extension}`) ? defaultFilename : `${defaultFilename}.${extension}`;

  // Try modern File System Access API (Native Windows 'Save As' Dialog with Path Picker)
  if (typeof window !== 'undefined' && 'showSaveFilePicker' in window) {
    try {
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: safeFilename,
        types: [
          {
            description,
            accept: {
              [mimeType]: [`.${extension}`]
            }
          }
        ]
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return;
    } catch (err: any) {
      // If user deliberately cancelled the dialog, don't trigger anchor fallback
      if (err.name === 'AbortError') return;
      console.warn('Native SavePicker not supported or rejected, falling back to download link:', err);
    }
  }

  // Anchor fallback with explicit File and guaranteed extension
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
  setTimeout(() => {
    try {
      if (document.body.contains(anchor)) {
        document.body.removeChild(anchor);
      }
      URL.revokeObjectURL(blobUrl);
    } catch {}
  }, 60000);
}
