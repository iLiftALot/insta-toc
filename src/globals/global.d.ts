declare global {
    type Omitted<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;

    function assert<T>(
        value: T | null | undefined,
        message?: string
    ): asserts value is NonNullable<T>;
}

export {};
