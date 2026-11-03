/**
 * Returns a `requestRender` function that draws the page on the next tick instead of immediately.
 *
 * Why: a page render replaces every element. A field commits on `change`, which fires while focus is
 * still leaving it, so rendering at once would put focus back in the field (Tab would not move on)
 * and would destroy a button under the pointer (the click would be lost). Waiting a tick lets focus
 * move first, and waiting for `pointerup` lets the click finish. Repeated requests are merged into one.
 */
export function createRenderScheduler(render: () => void): () => void {
  let pointerDown = false;
  let waitingForPointer = false;
  let scheduled = false;

  const schedule = (): void => {
    if (scheduled) return;
    scheduled = true;
    setTimeout(() => {
      scheduled = false;
      render();
    }, 0);
  };

  const release = (): void => {
    pointerDown = false;
    if (waitingForPointer) {
      waitingForPointer = false;
      schedule();
    }
  };

  document.addEventListener("pointerdown", () => (pointerDown = true), true);
  document.addEventListener("pointerup", release, true);
  document.addEventListener("pointercancel", release, true);

  return () => {
    if (pointerDown) waitingForPointer = true;
    else schedule();
  };
}
