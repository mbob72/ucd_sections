/**
 * Checks that the symbol is from valid ranges.
 */
const inAllowedSymbols = (x: string): boolean => {
    // /[a-zA-Z0-9_]/
    const code = x.charCodeAt(0);
    return (
        code >= 97 && code <= 122 /* [a-z] */ ||
        code >= 48 && code <= 57 /* [0-9] */ ||
        code >= 65 && code <= 90 /* [A-Z] */ ||
        code === 95 /* _ */
    );
};

export default inAllowedSymbols;
