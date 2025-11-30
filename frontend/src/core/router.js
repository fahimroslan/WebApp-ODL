export class Router {
    constructor({ initial = '', onChange } = {}) {
        this.active = initial;
        this.onChange = onChange;
        if (initial && typeof onChange === 'function') {
            onChange(initial);
        }
    }

    go(target) {
        if (!target || target === this.active) return;
        this.active = target;
        if (typeof this.onChange === 'function') {
            this.onChange(target);
        }
    }
}
