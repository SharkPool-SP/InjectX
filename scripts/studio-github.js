import { alert } from "./modal.js";
import {
  ioWrap,
  validatePathName,
  extractRepoInfo,
  toggleDisable,
} from "./utils.js";
import {
  genDirectoryContentApi,
  getRepoFile,
  createModulePullRequest,
} from "./github-interact.js";

/* global Events */
const gui = {};
const gitState = {
  repo: null,
  branch: null,
  modDir: null,
  srcDir: null,
  isPR: false,
  token: null,
  gitFiles: [],
};

let state = {};

const updateGuiState = function () {
  state = Events.request("REQ_STATE")[0];

  gui.repoUrlInp = document.querySelector(`input[name="repo-url"]`);
  gui.branchInp = document.querySelector(`input[name="branch"]`);
  gui.modDirInp = document.querySelector(`input[name="module-path"]`);
  gui.srcDirInp = document.querySelector(`input[name="inject-path"]`);
  gui.gitTokenInp = document.querySelector(`input[name="token"]`);
  gui.createPrInp = document.querySelector(`input[name="create-pr"]`);
  gui.getRepoBtn = document.getElementById("get-repo");
  gui.createPrBtn = document.getElementById("submit-pr");

  gui.branchDisplays = Array.from(
    document.querySelectorAll(`span[class="branch-display"]`),
  );
};

const updateBranchDisplays = function () {
  for (const display of gui.branchDisplays) {
    display.textContent = gitState.branch;
  }
};

const updatePrOptions = function () {
  toggleDisable(gui.gitTokenInp.parentNode, !gitState.isPR);
  toggleDisable(gui.srcDirInp.parentNode.parentNode, !gitState.isPR);
  Events.emit("UPDATE_PR_BUTTON");
};

const _handleRepoInput = (event) => {
  const value = String(event.target.value);
  try {
    const url = new URL(value);
    if (url.host !== "github.com") throw new Error("Invalid Github Repo");

    gitState.repo = url;
  } catch {
    gitState.repo = null;
  }

  toggleDisable(gui.getRepoBtn, !gitState.repo);
};

const _handleRepoFetch = async function () {
  Events.emit("REMOVE_ALL_MODULES");
  gui.getRepoBtn.setAttribute("disabled", "");

  const { org, repo, branch } = extractRepoInfo(gitState.repo);
  if (!gitState.branch && branch) gitState.branch = branch;

  const url = genDirectoryContentApi(
    org,
    repo,
    gitState.modDir,
    gitState.branch,
  );

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Repo Fetch Failed");

    const directoryContent = await response.json();
    const directoryFiles = directoryContent.filter((f) => f.type === "file");

    gitState.gitFiles = directoryFiles;
    Events.emit("REPO_FETCHED");
  } catch {
    alert(
      "Download Error",
      `Couldn't retrieve repository data from URL: "${url}`,
    );
  }
};

const _handleCreatePR = async function () {
  toggleDisable(gui.createPrBtn, true);

  const { org, repo, branch } = extractRepoInfo(gitState.repo);
  const status = await createModulePullRequest(
    org,
    repo,
    branch ?? "main",
    gitState.token,
    gitState.srcDir,
    state.compiledModules,
  );

  if (status.success) {
    window.open(status.url, "_blank");
    alert("Pull Request Success", status.msg);
  } else {
    alert("Pull Request Error", "Error creating pull request: " + status.msg);
  }
};

const setup = function () {
  updateGuiState();

  /* Repo URL input */
  ioWrap(gui.repoUrlInp, "input", _handleRepoInput);

  /* Branch input */
  ioWrap(gui.branchInp, "input", (e) => {
    gitState.branch = validatePathName(e.target.value, "root");
    e.target.value = gitState.branch;
    updateBranchDisplays();
    toggleDisable(gui.getRepoBtn, !gitState.repo);
  });

  /* Module route input */
  ioWrap(gui.modDirInp, "change", (e) => {
    gitState.modDir = validatePathName(e.target.value, "path");
    e.target.value = gitState.modDir;
    toggleDisable(gui.getRepoBtn, !gitState.repo);
  });

  /* Pull request input */
  ioWrap(gui.createPrInp, "change", (e) => {
    gitState.isPR = e.target.checked;
    updatePrOptions();
  });

  /* Token input */
  ioWrap(gui.gitTokenInp, "input", (e) => {
    gitState.token = String(e.target.value);
    Events.emit("UPDATE_PR_BUTTON");
  });

  /* Injection route input */
  ioWrap(gui.srcDirInp, "change", (e) => {
    gitState.srcDir = validatePathName(e.target.value, "path");
    e.target.value = gitState.srcDir;
    Events.emit("UPDATE_PR_BUTTON");
  });

  /* GitHub Interaction buttons */
  ioWrap(gui.getRepoBtn, "click", _handleRepoFetch);
  ioWrap(gui.createPrBtn, "click", _handleCreatePR);
};

Events.on("REPO_FETCHED", () => {
  const callback = async (file) => {
    const { success, code } = await getRepoFile(file.download_url);
    const name = (success ? "" : "⚠️ ") + file.name;

    Events.emit("NEW_MODULE", name, code);
  };

  for (const file of gitState.gitFiles) {
    // Delay to avoid server stress/DDOS
    setTimeout(() => callback(file), 100);
  }
});

Events.on("UPDATE_PR_BUTTON", () => {
  if (gui.createPrBtn) {
    toggleDisable(
      gui.createPrBtn,
      !(
        gitState.isPR &&
        gitState.token &&
        gitState.srcDir &&
        state.compiledModules.size > 0
      ),
    );
  }
});

export { setup };
