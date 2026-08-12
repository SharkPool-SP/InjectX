import { ioWrap } from "./utils.js";

/* global Events */
const gui = {};
let state = {};

const updateGuiState = function () {
  state = Events.request("REQ_STATE")[0];

  gui.addModuleBtn = document.getElementById("add-module");
  gui.uploadModuleBtn = document.getElementById("upload-module");
  gui.uploadModuleFileInput = gui.uploadModuleBtn.querySelector("input");
};

const _handleModuleUpload = function (event) {
  const files = event.target.files;
  for (const file of files) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const textContent = e.target.result;
      Events.emit("NEW_MODULE", file.name, textContent);
    };
    reader.readAsText(file);
  }

  event.target.value = "";
};

const setup = function () {
  updateGuiState();

  /* Add Module buttons */
  ioWrap(gui.uploadModuleFileInput, "change", _handleModuleUpload);
  ioWrap(gui.uploadModuleBtn, "click", (_, target) => {
    gui.uploadModuleFileInput.click();
  });

  ioWrap(gui.addModuleBtn, "click", () => {
    const name = prompt("Enter name of Module");
    if (name) Events.emit("NEW_MODULE", name, "");
  });

  // Default module setup
  const modules = Events.request("REQ_STARTER_MODULES")[0];
  for (const module of modules) {
    Events.emit("NEW_MODULE", module.name, module.code);
  }
};

export { setup };
