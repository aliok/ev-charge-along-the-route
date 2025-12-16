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
        if (options.className) element.className = options.className;
        if (options.id) element.id = options.id;
        if (options.textContent) element.textContent = options.textContent;
        if (options.innerHTML) element.innerHTML = options.innerHTML;
        if (options.title) element.title = options.title;
        
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
        textContent: text
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
        attributes: options.attributes
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
        attributes: { src, alt }
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

/**
 * Removes one or more CSS classes from an element.
 * @param element - The element to modify
 * @param classes - Class names to remove (varargs)
 */
export function removeClass(element: HTMLElement | null, ...classes: string[]): void {
    if (element && classes.length > 0) {
        element.classList.remove(...classes);
    }
}

/**
 * Toggles a CSS class on an element.
 * @param element - The element to modify
 * @param className - Class name to toggle
 * @param force - Optional boolean to force add (true) or remove (false)
 * @returns true if class is now present, false otherwise
 */
export function toggleClass(element: HTMLElement | null, className: string, force?: boolean): boolean {
    if (!element) return false;
    return element.classList.toggle(className, force);
}

/**
 * Checks if an element has a CSS class.
 * @param element - The element to check
 * @param className - Class name to check for
 * @returns true if element has the class
 */
export function hasClass(element: HTMLElement | null, className: string): boolean {
    return element?.classList.contains(className) ?? false;
}

/**
 * Sets the display style of an element.
 * @param element - The element to modify
 * @param display - Display value ('none', 'block', 'flex', etc.)
 */
export function setDisplay(element: HTMLElement | null, display: string): void {
    if (element) {
        element.style.display = display;
    }
}

/**
 * Shows an element by setting display to 'block' (or custom value).
 * @param element - The element to show
 * @param displayValue - Optional display value (defaults to 'block')
 */
export function show(element: HTMLElement | null, displayValue: string = 'block'): void {
    setDisplay(element, displayValue);
}

/**
 * Hides an element by setting display to 'none'.
 * @param element - The element to hide
 */
export function hide(element: HTMLElement | null): void {
    setDisplay(element, 'none');
}

/**
 * Sets the visibility of an element.
 * @param element - The element to modify
 * @param visible - true to make visible, false to hide
 */
export function setVisibility(element: HTMLElement | null, visible: boolean): void {
    if (element) {
        element.style.visibility = visible ? 'visible' : 'hidden';
    }
}

/**
 * Sets the opacity of an element.
 * @param element - The element to modify
 * @param opacity - Opacity value (0-1)
 */
export function setOpacity(element: HTMLElement | null, opacity: number): void {
    if (element) {
        element.style.opacity = opacity.toString();
    }
}

/**
 * Queries for a single element with type safety.
 * @param selector - CSS selector
 * @param parent - Optional parent element (defaults to document)
 * @returns The element or null
 */
export function querySelector<T extends HTMLElement = HTMLElement>(
    selector: string,
    parent: ParentNode = document
): T | null {
    return parent.querySelector<T>(selector);
}

/**
 * Queries for multiple elements with type safety.
 * @param selector - CSS selector
 * @param parent - Optional parent element (defaults to document)
 * @returns Array of elements
 */
export function querySelectorAll<T extends HTMLElement = HTMLElement>(
    selector: string,
    parent: ParentNode = document
): T[] {
    return Array.from(parent.querySelectorAll<T>(selector));
}

/**
 * Gets an element by ID with type safety.
 * @param id - Element ID
 * @returns The element or null
 */
export function getById<T extends HTMLElement = HTMLElement>(id: string): T | null {
    return document.getElementById(id) as T | null;
}

/**
 * Adds an event listener with type safety.
 * @param element - The element to attach listener to
 * @param event - Event name
 * @param handler - Event handler function
 * @param options - Optional event listener options
 */
export function addEventListener<K extends keyof HTMLElementEventMap>(
    element: HTMLElement | null,
    event: K,
    handler: (event: HTMLElementEventMap[K]) => void,
    options?: AddEventListenerOptions
): void {
    if (element) {
        element.addEventListener(event, handler as EventListener, options);
    }
}

/**
 * Removes an event listener with type safety.
 * @param element - The element to remove listener from
 * @param event - Event name
 * @param handler - Event handler function
 * @param options - Optional event listener options
 */
export function removeEventListener<K extends keyof HTMLElementEventMap>(
    element: HTMLElement | null,
    event: K,
    handler: (event: HTMLElementEventMap[K]) => void,
    options?: EventListenerOptions
): void {
    if (element) {
        element.removeEventListener(event, handler as EventListener, options);
    }
}
