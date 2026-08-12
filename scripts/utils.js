const EXTENSION_MODE_MAP = {
  // Web Core
  js: "ace/mode/javascript",
  mjs: "ace/mode/javascript",
  cjs: "ace/mode/javascript",
  jsx: "ace/mode/javascript",
  ts: "ace/mode/typescript",
  tsx: "ace/mode/typescript",
  html: "ace/mode/html",
  htm: "ace/mode/html",
  xhtml: "ace/mode/html",
  css: "ace/mode/css",
  scss: "ace/mode/scss",
  less: "ace/mode/less",

  // Data & Config
  svg: "ace/mode/xml",
  xml: "ace/mode/xml",
  json: "ace/mode/json",
  json5: "ace/mode/json",
  yaml: "ace/mode/yaml",
  yml: "ace/mode/yaml",
  toml: "ace/mode/toml",
  csv: "ace/mode/csv",
  ini: "ace/mode/ini",
  cfg: "ace/mode/ini",
  conf: "ace/mode/ini",

  // Backend & Systems Languages
  py: "ace/mode/python",
  pyw: "ace/mode/python",
  pyi: "ace/mode/python",
  java: "ace/mode/java",
  c: "ace/mode/c_cpp",
  h: "ace/mode/c_cpp",
  cc: "ace/mode/c_cpp",
  cpp: "ace/mode/c_cpp",
  cxx: "ace/mode/c_cpp",
  hpp: "ace/mode/c_cpp",
  hh: "ace/mode/c_cpp",
  hxx: "ace/mode/c_cpp",
  m: "ace/mode/objectivec",
  mm: "ace/mode/objectivec",
  cs: "ace/mode/csharp",
  go: "ace/mode/golang",
  rs: "ace/mode/rust",

  // Scripting & Shells
  rb: "ace/mode/ruby",
  rake: "ace/mode/ruby",
  gemspec: "ace/mode/ruby",
  php: "ace/mode/php",
  php3: "ace/mode/php",
  php4: "ace/mode/php",
  php5: "ace/mode/php",
  phtml: "ace/mode/php",
  pl: "ace/mode/perl",
  pm: "ace/mode/perl",
  pod: "ace/mode/perl",
  lua: "ace/mode/lua",
  sh: "ace/mode/sh",
  bash: "ace/mode/sh",
  zsh: "ace/mode/sh",
  ksh: "ace/mode/sh",
  shell: "ace/mode/sh",
  bat: "ace/mode/batchfile",
  cmd: "ace/mode/batchfile",
  ps1: "ace/mode/powershell",
  psm1: "ace/mode/powershell",
  psd1: "ace/mode/powershell",

  // Functional & Ecosystems
  kt: "ace/mode/kotlin",
  kts: "ace/mode/kotlin",
  swift: "ace/mode/swift",
  dart: "ace/mode/dart",
  scala: "ace/mode/scala",
  sc: "ace/mode/scala",
  groovy: "ace/mode/groovy",
  gradle: "ace/mode/groovy",
  r: "ace/mode/r",
  matlab: "ace/mode/matlab",
  asm: "ace/mode/assembly_x86",
  s: "ace/mode/assembly_x86",
  hs: "ace/mode/haskell",
  lhs: "ace/mode/haskell",
  ex: "ace/mode/elixir",
  exs: "ace/mode/elixir",
  erl: "ace/mode/erlang",
  hrl: "ace/mode/erlang",
  clj: "ace/mode/clojure",
  cljs: "ace/mode/clojure",
  cljc: "ace/mode/clojure",
  lisp: "ace/mode/lisp",
  lsp: "ace/mode/lisp",
  cl: "ace/mode/lisp",
  scm: "ace/mode/scheme",
  fs: "ace/mode/fsharp",
  fsi: "ace/mode/fsharp",
  fsx: "ace/mode/fsharp",
  vb: "ace/mode/visualbasic",
  vbs: "ace/mode/vbscript",

  // Documentation, Tooling & Databases
  sql: "ace/mode/sql",
  proto: "ace/mode/protobuf",
  graphql: "ace/mode/graphql",
  gql: "ace/mode/graphql",
  md: "ace/mode/markdown",
  markdown: "ace/mode/markdown",
  mdown: "ace/mode/markdown",
  mkdn: "ace/mode/markdown",
  tex: "ace/mode/latex",
  latex: "ace/mode/latex",
  dockerfile: "ace/mode/dockerfile",
  make: "ace/mode/makefile",
  mk: "ace/mode/makefile",
  diff: "ace/mode/diff",
  patch: "ace/mode/diff",
  txt: "ace/mode/text",
  text: "ace/mode/text",
};

/**
 * Adds a specified listener to a specified element with a callback.
 *
 * @param {Node} element Node that has the listener
 * @param {String} type Type of event to listen for
 * @param {Function} callback Handler that runs when the event is dispatched
 */
const ioWrap = function (element, type, callback) {
  element.addEventListener(type, (e) => {
    callback(e, element);
    e.stopPropagation();
  });
};

/**
 * Checks if the inputted name is a valid module name.
 *
 * @param {String} name Module name to check
 * @returns True if the name is valid
 */
const isValidModuleName = function (name) {
  const directives = name.split(".");
  const fileType = directives[directives.length - 1];
  if (name && directives.length > 1 && fileType.length > 0) {
    return true;
  }

  alert(
    `Invalid module name: "${name}". Module names must include a file extension, such as "example.js".`,
  );
  return false;
};

/**
 * Validates a path name/route.
 *
 * @param {String} name The name to validate
 * @param {"root"|"path"} type Type/Directory of the name
 * @returns Validated path name/route
 */
const validatePathName = function (name, type) {
  let pathname = String(name);
  if (pathname.startsWith("/")) pathname = pathname.substr(1);
  if (!pathname) return "";

  if (type === "root") {
    // ex: xxx GOOD, xxx/ WRONG, x/xxx/ WRONG
    pathname = pathname.replaceAll("/", "");
  } else {
    // ex: xxx/yyy/ GOOD, xxx/yyy WRONG
    if (!pathname.endsWith("/")) pathname += "/";
  }

  return pathname;
};

/**
 * Downloads a string file to the user's device.
 *
 * @param {String} name File name
 * @param {String} content File content
 */
const downloadFile = function (name, content) {
  const blob = new Blob([content], { type: "text/plain" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.href = url;
  link.download = name;
  link.click();

  URL.revokeObjectURL(url);
};

/**
 * Returns the proper Ace editor mode for a specified file name.
 *
 * @param {String} name File name to read
 * @returns Ace editor mode
 */
const getEditorModeFromName = function (name) {
  if (!name) return "ace/mode/text";

  const extension = name.split(".").pop().toLowerCase();

  return EXTENSION_MODE_MAP[extension] || "ace/mode/text";
};

/**
 * Extract ownership and routing details from a GitHub repository url.
 *
 * @param {String} urlString URL to a Github repository
 * @returns {{ org: String, repo: String, branch: String }} An object containing the repository details
 * @property {String} org Organization or user account name
 * @property {String} repo Name of the repository
 * @property {String} branch - The specific branch name extracted from the URL
 */
const extractRepoInfo = function (urlString) {
  try {
    const url = new URL(urlString);
    const pathname = url.pathname;
    const parts = pathname.split("/");

    return {
      org: parts[1],
      repo: parts[2],
      branch: parts[4] ?? null,
    };
  } catch {
    console.warn("Invalid GitHub URL");
    return null;
  }
};

/**
 * Toggles disabled on a specified node.
 *
 * @param {Node} node HTML Node to toggle disable
 * @param {Boolean} disabled true if disabled
 */
const toggleDisable = function (node, disabled) {
  if (disabled) node.setAttribute("disabled", "");
  else node.removeAttribute("disabled");
};

export {
  ioWrap,
  isValidModuleName,
  validatePathName,
  downloadFile,
  getEditorModeFromName,
  extractRepoInfo,
  toggleDisable,
};
