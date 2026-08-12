/**
 * Lightweight Script Injector/Linker
 *
 * InjectX combines source code (modules) into fully compiled scripts
 * using a basic comment command: '@InjectX <moduleName>'.
 *
 * This is designed to work without requiring language-specific parsing.
 *
 * Each directive must appear on its own line. The entire line containing
 * `@InjectX` will be replaced with the content of the referenced module.
 *
 * @class InjectX
 * @author Vicente G. <https://github.com/SharkPool-SP>
 * @version 2026.1.0.0
 */
class InjectX {
  /**
   * Module source code types.
   *
   * @typedef ModuleType
   */
  static TYPE_TEXT = 0;
  static TYPE_URL = 1;
  static TYPE_FILE = 2;

  /**
   * Performs an HTTP fetch request.
   *
   * @private
   * @param {string} url Resource URL.
   * @param {Object} params Fetch options.
   * @param {string} returnType Response body reader method (e.g. "text", "blob").
   * @returns {Promise<null|*>} null if request fails, otherwise response data.
   */
  static async _fetch(url, params, returnType) {
    try {
      const response = await fetch(url, params);
      if (!response.ok) return null;
      return await response[returnType]();
    } catch {
      return null;
    }
  }

  /**
   * Validates a module structure.
   *
   * @private
   * @param {ModuleType} module The module to be validated
   * @throws {Error} If module structure is invalid
   */
  static _validateModule(module) {
    if (
      typeof module !== "object" ||
      typeof module.type !== "number" ||
      (typeof module.src !== "string" && !(module.src instanceof File))
    ) {
      throw new Error("Invalid module!");
    }
  }

  /**
   * Initializes a Module.
   * This will decode the source code if a url or File is provided.
   *
   * @private
   * @param {Module} module The module to initialize
   */
  static async _initModule(module) {
    InjectX._validateModule(module);

    switch (module.type) {
      case InjectX.TYPE_URL: {
        const blob = await InjectX._fetch(module.src, {}, "blob");
        if (!blob) {
          throw new Error("Cannot initialize module from URL: " + module.src);
        }

        module.src = await blob.text();
        break;
      }
      case InjectX.TYPE_FILE: {
        if (!(module.src instanceof File)) {
          throw new Error("FILE type must use File object");
        }

        module.src = await module.src.text();
        break;
      }
    }

    module.type = InjectX.TYPE_TEXT;
  }

  /**
   * Constructs a InjectX object.
   */
  constructor() {
    this.modules = new Map();
  }

  /**
   * Intialize all Modules in this InjectX object.
   *
   * @private
   */
  async _initializeAllModules() {
    const iterator = this.modules.values();
    let item = iterator.next();
    while (!item.done) {
      const module = item.value;
      await InjectX._initModule(module);

      item = iterator.next();
    }
  }

  /**
   * Clear all modules from this InjectX object.
   */
  clearModules() {
    this.modules.clear();
  }

  /**
   * Creates a new Module for this InjectX Object.
   *
   * @typedef Module
   * @param {String} name The name of this module
   * @param {ModuleType} type The type of this module
   * @param {String} src Source code or url of the module
   * @returns {Module}
   */
  newModule(name, type, src) {
    this.modules.set(String(name), {
      type: type ?? InjectX.TYPE_TEXT,
      src: src ?? "",
    });
  }

  /**
   * Link and combine all modules in this InjectX object.
   *
   * @returns Array of compiled modules
   */
  async link() {
    if (!this.modules || this.modules.size === 0) {
      throw new Error("No modules provided!");
    }

    await this._initializeAllModules();

    const compiledCache = new Map();
    const compiling = new Set();

    const recursiveCompile = (name) => {
      if (compiledCache.has(name)) return compiledCache.get(name);

      if (compiling.has(name)) {
        throw new Error("Circular dependency detected at: " + name);
      }

      const module = this.modules.get(name);
      if (!module) throw new Error("Missing module: " + name);
      compiling.add(name);

      const lines = module.src.split("\n");
      const compiledLines = lines.map((line) => {
        const match = line.match(/^(\s*).*@InjectX\s+([^\s]+)/);
        if (!match) return line;

        const indent = match[1];
        const depName = match[2];
        const compiledDep = recursiveCompile(depName);
        return compiledDep
          .split("\n")
          .map((l, i) => indent + l)
          .join("\n");
      });

      const compiledSrc = compiledLines.join("\n");
      compiling.delete(name);
      compiledCache.set(name, compiledSrc);
      return compiledSrc;
    };

    const iterator = this.modules.keys();
    const result = [];
    let item = iterator.next();
    while (!item.done) {
      const moduleName = item.value;
      result.push({
        name: moduleName,
        src: recursiveCompile(moduleName),
      });

      item = iterator.next();
    }

    return result;
  }
}

export { InjectX };
