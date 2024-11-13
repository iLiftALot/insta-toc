declare module "Utility" {
    export function debounce(
        func: (...args: any[]) => void,
        wait: number
    ): (...args: any[]) => void;
}
