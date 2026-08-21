/* global ace, Events */
import { InjectX } from "../dist/InjectX.js";
import { setup as setupCode } from "./studio-code.js";
import { setup as setupGitHub } from "./studio-github.js";
import { prompt, alert } from "./modal.js";
import {
  ioWrap,
  isValidModuleName,
  downloadFile,
  getEditorModeFromName,
  toggleDisable,
} from "./utils.js";

const STARTER_MODULES = [
  {
    name: "Module_2.js",
    code: `const result = 10 + 25;\nconsole.log("Result: " + result);`,
  },
  {
    name: "Module_1.js",
    code: `const enabled = true;\n\nif (enabled) {\n  /* @InjectX Module_2.js */\n}`,
  },
];

const gui = {};

const state = {
  injector: new InjectX(),
  modules: new Map(),
  compiledModules: new Map(),
  isGitHubVersion: null,
  module: null,
  isViewingOutput: null,
  editor: null,
  editorReadOnly: false,
};

/**
 * Creates a new editable module.
 *
 * @param {String} name Name of module
 * @param {String} code Code stored in this module
 */
const newModule = function (name, code) {
  if (!isValidModuleName(name)) return;

  if (!state.modules.has(name)) {
    const node = gui.moduleList.firstElementChild.cloneNode(true);
    node.removeAttribute("style");
    node.querySelector("span").textContent = name;
    node._modName = [false, name];

    gui.moduleList.appendChild(node);
  }

  state.modules.set(name, code);
  selectModule([false, name]);
};

/**
 * Creates a new non-editable output module.
 *
 * @param {String} name Name of output module
 * @param {String} code Code stored in this module
 */
const newOutputModule = function (name, code) {
  if (!state.compiledModules.has(name)) {
    const node = gui.outputList.firstElementChild.cloneNode(true);
    node.removeAttribute("style");
    node.querySelector("span").textContent = name;
    node._modName = [true, name];

    gui.outputList.appendChild(node);
  }

  state.compiledModules.set(name, code);
};

/**
 * Selects a module from the module/output list.
 *
 * @param {[Boolean, String]} moduleData Array containing the selection type and module name
 * @param {boolean} moduleData.0 True if the module is an output module; false if it is a regular module
 * @param {string} moduleData.1 Name of the module to select
 */
const selectModule = function ([isOutputModule, name]) {
  const allModules = [...gui.moduleList.children, ...gui.outputList.children];

  for (const child of allModules) {
    if (!child._modName) continue;
    if (child._modName[0] === isOutputModule && child._modName[1] === name) {
      child.setAttribute("selected", true);

      state.editorReadOnly = child._modName[0];
      Events.emit(
        "VIEW_STATE",
        child._modName[0] ? "output" : "module",
        child._modName[1],
      );
      Events.emit("UPDATE_EDITOR");
    } else {
      child.removeAttribute("selected");
    }
  }
};

/**
 * Edits the name of the selected module.
 *
 * @param {Node} moduleNode Module list HTML node to edit
 * @param {String} newName New name for the module
 */
const editModuleName = function (moduleNode, newName) {
  if (!isValidModuleName(newName) || state.modules.has(newName)) return;

  moduleNode.querySelector("span").textContent = newName;
  moduleNode._modName[1] = newName;

  state.modules.set(newName, state.modules.get(state.module));
  state.modules.delete(state.module);
  Events.emit("VIEW_STATE", "module", newName);

  // in case the file type was changed:
  Events.emit("EDITOR_MODE_CHANGED", newName);
};

/**
 * Removes all modules from the module list.
 */
const removeAllModules = function () {
  const children = Array.from(gui.moduleList.children);
  for (let i = children.length - 1; i > 0; i--) {
    children[i].remove();
  }
};

const executeInject = async function () {
  state.compiledModules.clear();
  state.injector.clearModules();

  // add modules
  const iterator = state.modules.entries();
  let item = iterator.next();
  while (!item.done) {
    const module = item.value;
    state.injector.newModule(module[0], InjectX.TYPE_TEXT, module[1]);

    item = iterator.next();
  }

  try {
    const results = await state.injector.link();

    // Only show changed files
    const changedFiles = results.filter(
      (m) => m.src !== state.modules.get(m.name),
    );
    for (const module of changedFiles) newOutputModule(module.name, module.src);

    Events.emit("UPDATE_PR_BUTTON");
  } catch (err) {
    console.warn(err);
    alert("Injection Error", "Reason: " + err.message);
  }
};

/**
 * Updates the GUI reference object.
 */
const updateGuiState = function () {
  gui.injectBtn = document.getElementById("inject-btn");
  gui.downloadBtn = document.getElementById("download-module");
  gui.moduleList = document.getElementById("module-list");
  gui.outputList = document.getElementById("output-list");

  try {
    const storedState = localStorage.getItem("InjectX-theme");
    state.dark = storedState === null || storedState === "dark";
  } catch {}
};

/**
 * Sets up the code editor.
 */
const setupEditor = function () {
  const editor = ace.edit(document.getElementById("editor"));
  state.editor = editor;

  editor.setFontSize(14);
  editor.setReadOnly(state.isGitHubVersion);
  editor.setOptions({
    tabSize: 2,
    useSoftTabs: true,
    enableBasicAutocompletion: true,
    enableLiveAutocompletion: true,
    enableSnippets: true,
  });

  if (state.dark) {
    editor.setTheme("ace/theme/tomorrow_night_bright");
  }

  editor.session.on("change", () => {
    if (state.isViewingOutput) return;

    const code = editor.getValue();
    state.modules.set(state.module, code);
  });
};

/**
 * Sets up listeners and handlers for basic UI.
 */
const setupBasicUI = function () {
  /* Inject Button */
  ioWrap(gui.injectBtn, "click", _handleExecuteInject);

  /* Download Modules */
  ioWrap(gui.downloadBtn, "click", _handleModuleDownload);

  /* Module Lists */
  ioWrap(gui.moduleList, "click", _handleModuleListClick);
  ioWrap(gui.outputList, "click", _handleModuleListClick);
};

/**
 * Initializes the InjectX studio.
 */
const initStudio = async function () {
  document.title = "InjectX - Studio";

  const _urlPath = new URL(window.location);
  const isGitHubVersion = _urlPath.searchParams.has("github");
  const studioPart = isGitHubVersion ? "github" : "code";

  const response = await fetch(`./assets/parts/studio-${studioPart}.html`);
  const htmlPart = await response.text();
  document.querySelector("main").innerHTML = htmlPart;

  updateGuiState();
  state.isGitHubVersion = isGitHubVersion;

  setupEditor();
  setupBasicUI();
  if (isGitHubVersion) setupGitHub();
  else setupCode();
};

/**
 * Handler for module list clicks (selections).
 *
 * @private
 * @param {Event} event
 */
const _handleModuleListClick = async function (event) {
  const target = event.target;
  const item = target.closest(".list-item");
  if (!item || item.id) return;

  if (target.classList.contains("edit-item")) {
    const name = await prompt(
      "Edit Module",
      "Enter the new name of the Module:",
    );
    if (name) editModuleName(item, name);
    return;
  }

  if (target.classList.contains("trash-item")) {
    item.remove();
    state.modules.delete(state.module);

    const nextSelected = state.modules.keys().next().value;
    selectModule([false, nextSelected]);
    return;
  }

  if (item._modName) selectModule(item._modName);
};

/**
 * Handler for downloading output module code.
 *
 * @private
 */
const _handleModuleDownload = function () {
  const iterator = state.compiledModules.entries();
  let item = iterator.next();
  while (!item.done) {
    const module = item.value;
    downloadFile(module[0], module[1]);

    item = iterator.next();
  }
};

/**
 * Handler for starting the injection process.
 *
 * @private
 */
const _handleExecuteInject = function () {
  const children = Array.from(gui.outputList.children);
  for (let i = children.length - 1; i > 0; i--) {
    children[i].remove();
  }

  executeInject();
  toggleDisable(gui.downloadBtn, false);
};

Events.on("REQ_STATE", () => state);
Events.on("REQ_STARTER_MODULES", () => STARTER_MODULES);

Events.on("THEME_CHANGED", (mode) => {
  state.dark = mode === "dark";
  state.editor.setTheme(
    state.dark ? "ace/theme/tomorrow_night_bright" : "ace/theme/tomorrow",
  );
});

Events.on("NEW_MODULE", newModule);
Events.on("NEW_OUTPUT", newModule);
Events.on("REMOVE_ALL_MODULES", removeAllModules);

Events.on("VIEW_STATE", (type, value) => {
  state.isViewingOutput = type === "output";
  state.module = value;
});

Events.on("UPDATE_EDITOR", () => {
  const mode = getEditorModeFromName(state.module);
  const code = state.isViewingOutput
    ? state.compiledModules.get(state.module)
    : state.modules.get(state.module);

  state.editor.session.setMode(mode);
  state.editor.session.setValue(code ?? "");
  state.editor.setReadOnly(state.isGitHubVersion || state.editorReadOnly);
});

Events.on("EDITOR_MODE_CHANGED", (fileName) => {
  const mode = getEditorModeFromName(fileName);
  state.editor.session.setMode(mode);
});

initStudio();
