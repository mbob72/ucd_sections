export const isDataLink = str => /(?<!\\)[@$`([{]/.test(str) // a lookbehind checking is supported only by chrome browser. In version 64 it has been checked.
export const isLink = str => /^@[a-zA-Z0-9\\<>:_/-]+/.test(str)
export const isRootLink = str => /^@\/[a-zA-Z0-9\\<>:_/-]+/.test(str)
export const isFunction = str => /^\$[a-zA-Z0-9_-]+/.test(str)
export const isFunctionRef = str => /^\$[a-zA-Z0-9_-]+\b$/.test(str)
export const isFunctionCall = str => /^\$[a-zA-Z0-9_-]+\(.*?\)$/.test(str)
