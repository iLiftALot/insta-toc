export function debounce(
    func,
    wait
) {
    let timeout = null;
    return function (...args) {
        if (timeout !== null) {
            clearTimeout(timeout);
        }
        timeout = window.setTimeout(() => {
            func.apply(this, args);
            timeout = null;
        }, wait);
    };
}