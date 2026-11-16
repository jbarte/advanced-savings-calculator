/** Named after the app, like the plan, theme and language keys. */
const STORAGE_KEY = "advanced-savings-calculator:guide-seen";

/** Whether saved text says the guide has been shown. Anything but the marker counts as not seen. */
export function readGuideSeen(text: string | null): boolean {
  return text === "1";
}

/** True when the guide was shown on an earlier visit. Storage that can't be read counts as seen, so it never nags. */
export function loadGuideSeen(): boolean {
  try {
    return readGuideSeen(localStorage.getItem(STORAGE_KEY));
  } catch {
    // Without storage the choice can't be remembered, and showing the guide on every visit would be a nuisance.
    return true;
  }
}

const RESUME_PREFIX = "resume-";

/** The step (from 0) saved text asks the guide to reopen at, or 0 when it asks for nothing or is not a step. */
export function readGuideResumeStep(text: string | null): number {
  const match = text === null ? null : /^resume-(\d{1,2})$/.exec(text);
  return match ? Number(match[1]) : 0;
}

/** The step the guide should reopen at after a reload (see `resumeGuideAt`), or 0. */
export function loadGuideResumeStep(): number {
  try {
    return readGuideResumeStep(localStorage.getItem(STORAGE_KEY));
  } catch {
    return 0;
  }
}

/**
 * Makes the guide open again at `step` on the next page load: the "seen" mark is replaced by the step to come back to.
 * Used when the language is switched from inside the guide, which reloads the page.
 */
export function resumeGuideAt(step: number): void {
  try {
    localStorage.setItem(STORAGE_KEY, `${RESUME_PREFIX}${step}`);
  } catch {
    // Storage blocked: the language can't be saved either, so there is nothing to come back to.
  }
}

export function saveGuideSeen(): void {
  try {
    localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    // Storage blocked (private mode etc.): the guide stays reachable from the app bar.
  }
}
