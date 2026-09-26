/** Small typed helpers so the demo wiring stays readable. */

export function el<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Missing element #${id}`);
  return node as T;
}

export interface RangeBinding {
  set(value: number): void;
}

/**
 * Wires a range input to a callback and keeps its `<output>` (id + "-out") in
 * sync. Returns a setter so presets can drive the slider too.
 */
export function bindRange(
  id: string,
  initial: number,
  onInput: (value: number) => void,
  format: (value: number) => string = (value) => String(value),
): RangeBinding {
  const input = el<HTMLInputElement>(id);
  const output = document.getElementById(`${id}-out`);

  const render = (value: number) => {
    if (output) output.textContent = format(value);
  };

  input.addEventListener('input', () => {
    const value = Number(input.value);
    render(value);
    onInput(value);
  });

  input.value = String(initial);
  render(initial);

  return {
    set(value: number) {
      input.value = String(value);
      render(value);
    },
  };
}

export function bindCheckbox(
  id: string,
  initial: boolean,
  onChange: (checked: boolean) => void,
): void {
  const input = el<HTMLInputElement>(id);
  input.checked = initial;
  input.addEventListener('change', () => onChange(input.checked));
  onChange(initial);
}

export const degrees = (value: number): string => `${Math.round(value)}\u00b0`;
export const fixed =
  (places: number) =>
  (value: number): string =>
    value.toFixed(places);
