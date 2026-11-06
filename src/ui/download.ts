/*
 * Moving files between the page and the user's computer. Nothing leaves the browser: a download is made from a Blob in
 * memory, and a file the user picks is read in memory.
 */

/** Offers text as a file to save. Returns false when the browser refuses (for example blocked downloads). */
export function downloadText(fileName: string, text: string, type: string): boolean {
  try {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.append(link);
    link.click();
    link.remove();
    // Some browsers start the download after the click returns, so the address is let go a little later.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
}

/**
 * Lets the user pick a file and reads it as text. Resolves with null when they cancel, or when the file is larger than
 * `maxBytes` (so a huge file is never read into memory; the caller's own check reports it).
 */
/** A file the user picked: its text, or that it was too large to read. */
export type PickedFile = { readonly text: string } | { readonly tooLarge: true };

export function pickTextFile(accept: string, maxBytes: number): Promise<PickedFile | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.addEventListener("cancel", () => resolve(null));
    input.addEventListener("change", () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);
      if (file.size > maxBytes) return resolve({ tooLarge: true });
      file.text().then(
        (text) => resolve({ text }),
        (error: unknown) => {
          console.error(error);
          resolve(null);
        },
      );
    });
    input.click();
  });
}
