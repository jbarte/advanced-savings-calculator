import type { en } from "./en";

/** Widens the literal types of `en` (as const) to string, keeping the shape and the parameter lists of functions. */
type Widen<T> = T extends string
  ? string
  : T extends (...args: infer Args) => string
    ? (...args: Args) => string
    : { readonly [Key in keyof T]: Widen<T[Key]> };

/** The shape every language has to fill in completely. Derived from `en`, so there is one list of texts to keep. */
export type Messages = Widen<typeof en>;
