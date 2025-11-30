export const qs = (selector, scope = document) => scope.querySelector(selector);
export const qsa = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

export function on(element, event, handler) {
    if (!element) return;
    element.addEventListener(event, handler);
}

export function toggleClass(element, className, force) {
    if (!element) return;
    element.classList.toggle(className, force);
}

export function show(element) {
    if (!element) return;
    element.classList.remove('hidden');
}

export function hide(element) {
    if (!element) return;
    element.classList.add('hidden');
}

export function setText(element, value) {
    if (!element) return;
    element.textContent = value;
}
