import type { PlanFields } from "../state/plan-document";
import { h } from "./dom";
import { inputIn } from "./dialog-form";

/** One krona in öre: the sliders work in whole kronor, the plan in öre. */
export const ORE_PER_KRONA = 100;

/**
 * The sliders' ranges: the everyday span, in the slider's units, not the whole allowed range (the typed field covers
 * that). Every value they can give is valid, so a preview never needs checking against PLAN_LIMITS.
 */
export const SLIDER_RANGES = {
  startAmount: { min: 0, max: 2_000_000, step: 10_000 },
  monthlyDeposit: { min: 0, max: 30_000, step: 500 },
  annualReturn: { min: 0, max: 12, step: 0.5 },
} as const;

/** A preview of the plan with some fields changed, drawn without saving anything. */
export type PreviewPlan = (patch: Partial<PlanFields>) => void;

export interface PlanSliderProps {
  /** The text field the slider sits under; its text follows the slider while it is dragged. */
  readonly field: HTMLElement;
  readonly label: string;
  readonly min: number;
  readonly max: number;
  readonly step: number;
  /** The plan's value in the slider's units (kronor, percent). A value outside the range puts the thumb at the end. */
  readonly value: number;
  /** The value as the text field shows it ("3 000", "6.5"). */
  readonly fieldText: (value: number) => string;
  /** The value as a screen reader says it ("3 000 kr per month"). */
  readonly valueText: (value: number) => string;
  readonly patch: (value: number) => Partial<PlanFields>;
  readonly preview: PreviewPlan;
  readonly commit: (patch: Partial<PlanFields>) => void;
  readonly dataKey: string;
}

/**
 * A slider under a text field of the Plan card. While it moves, the headline and the chart redraw from a preview and the
 * field's text follows; nothing is saved until it is let go (or a key press ends), as with typing. The typed field stays
 * the way to an exact value and to the whole allowed range, which is wider than the slider's.
 */
export function withPlanSlider(props: PlanSliderProps): HTMLElement {
  const clamped = Math.min(props.max, Math.max(props.min, props.value));
  const fieldInput = inputIn(props.field);
  const slider = h("input", {
    class: "slider field__slider",
    type: "range",
    min: props.min,
    max: props.max,
    step: props.step,
    value: clamped,
    "data-key": props.dataKey,
    "aria-label": props.label,
    "aria-valuetext": props.valueText(clamped),
  });
  const show = (value: number): void => {
    slider.style.setProperty("--pct", `${((value - props.min) / (props.max - props.min)) * 100}%`);
    slider.setAttribute("aria-valuetext", props.valueText(value));
  };
  slider.addEventListener("input", () => {
    const value = Number(slider.value);
    show(value);
    fieldInput.value = props.fieldText(value);
    props.preview(props.patch(value));
  });
  slider.addEventListener("change", () => props.commit(props.patch(Number(slider.value))));
  show(clamped);
  props.field.append(slider);
  return props.field;
}
