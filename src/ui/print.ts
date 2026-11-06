/*
 * Printing: the page is printed in the light theme with every closed table opened (the yearly figures), and put back
 * as it was afterwards. While printing, `data-printing` is set on <html>, so a table that opens for the printout does
 * not count as the user opening it.
 */

/** True while the page is being prepared for print or printed. */
export function isPrinting(): boolean {
  return document.documentElement.hasAttribute("data-printing");
}

/** Sets up the print preparation once, when the app starts. */
export function preparePrinting(): void {
  let restore: (() => void) | null = null;

  window.addEventListener("beforeprint", () => {
    const root = document.documentElement;
    const theme = root.getAttribute("data-theme");
    const closed = [...document.querySelectorAll("details:not([open])")].filter((d): d is HTMLDetailsElement => d instanceof HTMLDetailsElement);
    root.setAttribute("data-printing", "");
    root.setAttribute("data-theme", "light");
    closed.forEach((details) => (details.open = true));
    restore = () => {
      closed.forEach((details) => (details.open = false));
      if (theme === null) root.removeAttribute("data-theme");
      else root.setAttribute("data-theme", theme);
    };
  });

  window.addEventListener("afterprint", () => {
    restore?.();
    restore = null;
    // The toggles above fire their events after this, so the flag is lifted a moment later.
    setTimeout(() => document.documentElement.removeAttribute("data-printing"), 0);
  });
}
