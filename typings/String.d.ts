interface String {
    /**
     * 
     * @param path The path to simplify.
     * @returns The name of the current direcory.
     */
    simplifyPath(path: string): string;
    /**
     * Capitilizes the first letter of a string.
     */
    capitalize(): string;

    quotePrune(): string;
}