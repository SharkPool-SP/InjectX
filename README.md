# InjectX

> A lightweight, zero-dependency JavaScript script injector and linker designed to stitch source modules together using a simple `@InjectX` comment command.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-2026.1.0.0-green.svg)](#)

**InjectX** resolves dependencies and combines source code modules without requiring full AST or language-specific parsers. By using simple `@InjectX <moduleName>` directives, it enables modular development across raw text strings, external URLs, or user-uploaded `File` objects.

## How It Works

**InjectX** scans code for directives in the following format (on their own line):

```javascript
// @InjectX moduleName
/* @InjectX moduleName */
console.log("@InjectX moduleName "); // this works too!
```

During linking, the entire directive line is replaced with the compiled content of moduleName, maintaining the indentation of the directive line.

## Installation & Usage

Import:

```js
import { InjectX } from "./InjectX.js";
```

Basic Example:

```js
const injector = new InjectX();

// 1. Define raw text module
injector.newModule(
  "Utils",
  InjectX.TYPE_TEXT,
  `function add(num1, num2) {
  return num1 + num2;
}`,
);

// 2. Define a module that injects 'Utils'
injector.newModule(
  "Main",
  InjectX.TYPE_TEXT,
  `// @InjectX Utils

function app() {
  add(1, 3);
}
`,
);

// 3. Link and compile modules
const output = await injector.link();

console.log(output);
```

Output:

```js
[
  { name: "Utils", src: "..." },
  {
    name: "Main",
    src: "function add(num1, num2) {\n  return num1 + num2;\n}\n\nfunction app() {\n add(1, 3);\n}",
  },
];
```

## Module Types

**InjectX** supports three module source types:

| Type                | Value | Description           |
| ------------------- | ----- | --------------------- |
| `InjectX.TYPE_TEXT` | 0     | Direct string content |
| `InjectX.TYPE_URL`  | 1     | Remote resource URL   |
| `InjectX.TYPE_FILE` | 2     | Local browser file    |

## InjectX Documentation

```js
new InjectX();
```

Instantiates a new module injector registry.

---

```js
prototype.newModule(name, type, src);
```

Registers a module in the InjectX instance.

- `name` (string): Unique module identifier
- `type` (ModuleType): **InjectX.TYPE_TEXT, InjectX.TYPE_URL,** or **InjectX.TYPE_FILE**
- `src` (string | File): Module source code

---

```js
prototype.clearModules();
```

Clears all registered modules from this InjectX instance.

---

```js
async prototype.link()
```

Initializes all modules, links/injects them, and returns an array of compiled module outputs.

**Returns:** `Promise<Array<{ name: string, src: string }>>`

## Author & License

**Author:** Vicente G. ([@SharkPool-SP](https://github.com/SharkPool-SP))

**License:** MIT
