export function assert<T>(
    value: T | undefined | null,
    message?: string
): asserts value is NonNullable<T> {
    if (value == null || value === undefined) {
        throw new Error(message ?? "Expected value to be defined");
    }
}

export function injectGlobals(): void {
    (globalThis as typeof globalThis & { assert: typeof assert; }).assert = assert;
}
