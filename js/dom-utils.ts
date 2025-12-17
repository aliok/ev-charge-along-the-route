/**
 * DOM utility functions to reduce repetitive DOM manipulation code.
 */

/**
 * Creates an HTML element with specified attributes and content.
 */
export function createElement<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  options?: {
    className?: string;
    id?: string;
    textContent?: string;
    innerHTML?: string;
    title?: string;
    attributes?: Record<string, string>;
    dataset?: Record<string, string>;
    children?: (HTMLElement | string)[];
  }
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);

  if (options) {
    if (options.className) {
      element.className = options.className;
    }
    if (options.id) {
      element.id = options.id;
    }
    if (options.textContent) {
      element.textContent = options.textContent;
    }
    if (options.innerHTML) {
      element.innerHTML = options.innerHTML;
    }
    if (options.title) {
      element.title = options.title;
    }

    if (options.attributes) {
      for (const [key, value] of Object.entries(options.attributes)) {
        element.setAttribute(key, value);
      }
    }

    if (options.dataset) {
      for (const [key, value] of Object.entries(options.dataset)) {
        element.dataset[key] = value;
      }
    }

    if (options.children) {
      for (const child of options.children) {
        if (typeof child === 'string') {
          element.appendChild(document.createTextNode(child));
        } else {
          element.appendChild(child);
        }
      }
    }
  }

  return element;
}

/**
 * Creates a badge element with standard styling.
 */
export function createBadge(text: string, className: string): HTMLSpanElement {
  return createElement('span', {
    className: `marker-badge ${className}`,
    textContent: text,
  });
}

/**
 * Creates a button element with icon and optional click handler.
 */
export function createButton(options: {
  className?: string;
  title?: string;
  innerHTML?: string;
  textContent?: string;
  disabled?: boolean;
  attributes?: Record<string, string>;
  onClick?: (e: MouseEvent) => void;
}): HTMLButtonElement {
  const button = createElement('button', {
    className: options.className,
    title: options.title,
    innerHTML: options.innerHTML,
    textContent: options.textContent,
    attributes: options.attributes,
  });

  if (options.disabled) {
    button.disabled = true;
  }

  if (options.onClick) {
    button.addEventListener('click', options.onClick);
  }

  return button;
}

/**
 * Creates an image element with error fallback handling.
 */
export function createImageWithFallback(
  src: string,
  alt: string,
  className: string,
  fallbackContent: string,
  containerId?: string
): HTMLImageElement {
  const img = createElement('img', {
    className,
    attributes: { src, alt },
  }) as HTMLImageElement;

  img.onerror = () => {
    console.warn(`Favicon failed for ${src}, reverting to fallback.`);
    if (containerId) {
      const container = document.getElementById(containerId);
      if (container) {
        container.innerHTML = fallbackContent;
      }
    } else {
      // Replace img with fallback in parent
      const parent = img.parentElement;
      if (parent) {
        parent.innerHTML = fallbackContent;
      }
    }
  };

  return img;
}

/**
 * Gets checked values from a group of checkboxes.
 */
export function getCheckedValues(selector: string): string[] {
  return Array.from(document.querySelectorAll<HTMLInputElement>(selector))
    .filter(input => input.checked)
    .map(input => input.value);
}

/**
 * Gets the selected value from a radio button group.
 */
export function getSelectedRadioValue(selector: string, defaultValue: string = ''): string {
  const selected = document.querySelector<HTMLInputElement>(`${selector}:checked`);
  return selected?.value || defaultValue;
}

/**
 * Safely sets button disabled state.
 */
export function setButtonDisabled(button: HTMLButtonElement | null, disabled: boolean): void {
  if (button) {
    button.disabled = disabled;
  }
}

/**
 * Clears all children from an element.
 */
export function clearChildren(element: HTMLElement | null): void {
  if (element) {
    element.innerHTML = '';
  }
}

/**
 * Adds one or more CSS classes to an element.
 * @param element - The element to modify
 * @param classes - Class names to add (varargs)
 */
export function addClass(element: HTMLElement | null, ...classes: string[]): void {
  if (element && classes.length > 0) {
    element.classList.add(...classes);
  }
}
