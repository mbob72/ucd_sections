export const isDataLink = (str: string): boolean => /(?<!\\)[@$`([{]/.test(str); // a lookbehind checking is supported only by chrome browser. In version 64 it has been checked.
export const isLink = (str: string): boolean => /^@[a-zA-Z0-9\\<>:_/-]+/.test(str);
export const isRootLink = (str: string): boolean => /^@\/[a-zA-Z0-9\\<>:_/-]+/.test(str);
export const isFunction = (str: string): boolean => /^\$[a-zA-Z0-9_-]+/.test(str);
export const isFunctionRef = (str: string): boolean => /^\$[a-zA-Z0-9_-]+\b$/.test(str);
export const isFunctionCall = (str: string): boolean => /^\$[a-zA-Z0-9_-]+\(.*?\)$/.test(str);
