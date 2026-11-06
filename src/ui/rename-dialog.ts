import { renderTextField } from "./components";
import { h } from "./dom";
import { inputIn, openFormDialog, showErrors } from "./dialog-form";
import { errorMessage, parsePlanName } from "./parse-input";
import { messages } from "./i18n";

export interface RenameDialogProps {
  /** The plan's current name, or null when it has none. */
  readonly name: string | null;
  /** Gets the new name; empty text removes it. */
  readonly onSave: (name: string) => void;
}

/** A small prompt to name the plan. Nothing reaches the plan until Save. */
export function openRenameDialog(props: RenameDialogProps): void {
  const field = renderTextField({
    id: "plan-name",
    label: messages.dialogs.rename.label,
    unit: "",
    value: props.name ?? "",
    dataKey: "plan-name",
    placeholder: messages.planCard.names.own,
    validate: errorMessage(parsePlanName),
    onCommit: () => undefined, // the dialog reads the input itself on Save
  });
  const input = inputIn(field);

  /** Returns true when the name was valid and has been handed over. */
  const save = (): boolean => {
    if (!showErrors([input])) return false;
    const parsed = parsePlanName(input.value);
    if (!parsed.ok) return false;
    props.onSave(parsed.value);
    return true;
  };

  openFormDialog({
    title: messages.dialogs.rename.title,
    primaryLabel: messages.common.save,
    fields: [h("p", { class: "modal__text" }, messages.dialogs.rename.hint), field],
    save,
  });
}
