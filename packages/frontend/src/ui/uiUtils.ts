export function $id(id: string): HTMLElement | null {
  return window.document.getElementById(id);
}

export function $hide(elements: NodeListOf<HTMLElement>): void {
  elements.forEach((element) => element.classList.add('hidden'));
}

export function $elem(
  tagName: string,
  attr: Record<string, string> = {},
  content?: string | HTMLElement[]
): HTMLElement {
  const elem = document.createElement(tagName);
  Object.entries(attr).forEach(([key, value]) => elem.setAttribute(key, value));
  if (!content) {
    // nothing
  } else if (typeof content === 'string') {
    elem.textContent = content;
  } else {
    elem.append(...content);
  }
  return elem;
}

export function addCombo(
  parent: HTMLElement,
  options: {label?: string; autocomplete?: boolean},
  id: string,
  values: {key: string; value: string}[],
  onChange: (optionKey: string) => void
): void {
  if (options.autocomplete) {
    addAutocomplete(parent, options.label, id, values, onChange);
  } else {
    addSelect(parent, options, id, values, onChange);
  }
}

export function addSelect<T extends string = string>(
  parent: HTMLElement,
  options: {label?: string; selectedKey?: T},
  id: string,
  choices: {key: T; value: string}[],
  onChange: (optionKey: T) => void
): void {
  const select = document.createElement('select');
  select.classList.add('form-select');
  select.id = id;
  let first = true;
  for (const choice of choices) {
    let selectedKey: string | undefined = undefined;
    if (options.selectedKey) {
      if (choice.key === options.selectedKey) {
        selectedKey = choice.key;
        setTimeout(() => onChange(choice.key));
      }
    } else if (first) {
      selectedKey = choice.key;
      setTimeout(() => onChange(choice.key));
    }
    select.options.add(new Option(choice.value, choice.key, first, choice.key === selectedKey));
    first = false;
  }
  select.addEventListener('change', () => {
    onChange(select.value as T);
  });
  if (options.label) {
    const selectLabel = document.createElement('label');
    selectLabel.setAttribute('for', select.id);
    selectLabel.classList.add('form-label');
    selectLabel.textContent = options.label;
    parent.appendChild(selectLabel);
  }
  parent.appendChild(select);
}

export function addAutocomplete(
  parent: HTMLElement,
  label: string | undefined,
  id: string,
  values: {key: string; value: string}[],
  onChange: (optionKey: string) => void
): HTMLElement {
  const input = document.createElement('input');
  input.classList.add('form-control');
  input.id = id;
  input.setAttribute('list', `${id}-datalist`); // link the datalist
  input.setAttribute('type', `text`);
  input.setAttribute('required', `required`);
  input.setAttribute('spellcheck', `false`);
  input.setAttribute('autocorrect', `off`);
  input.setAttribute('autocomplete', `off`); // avoid previously types values to be added in the datalist
  input.setAttribute('placeholder', `Select a ${label ?? 'value'}...`);
  input.addEventListener('input', () => {
    onChange(input.value);
  });
  const datalist = document.createElement('datalist');
  datalist.id = `${id}-datalist`;
  values.forEach((option) => {
    datalist.appendChild(new Option(option.value, option.key));
  });
  if (label) {
    const selectLabel = document.createElement('label');
    selectLabel.setAttribute('for', input.id);
    selectLabel.classList.add('form-label');
    selectLabel.textContent = label;
    parent.appendChild(selectLabel);
  }
  parent.appendChild(input);
  parent.appendChild(datalist);
  return parent;
}
