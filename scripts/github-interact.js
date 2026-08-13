const GITHUB_API = "https://api.github.com/repos";
const GITHUB_RAW = "https://raw.githubusercontent.com/";

/**
 * Generates an API URL to list files in a repository directory.
 *
 * @param {String} org Organization name
 * @param {String} repo Repository name
 * @param {String} path Specified directory. Defaults to the root
 * @param {String} [opt_branch] Branch of repository. Defaults to main
 * @returns GitHub API URL
 */
const genDirectoryContentApi = function (org, repo, path, opt_branch) {
  let url = `${GITHUB_API}/${org}/${repo}/contents/${path ?? ""}`;
  if (opt_branch) url += `?ref=${opt_branch}`;

  return url;
};

/**
 * Gets the content of a file from a repository.
 *
 * @param {String} org Organization name
 * @param {String} repo Repository name
 * @param {String} path Specified directory. Defaults to the root
 * @param {String} [opt_branch] Branch of repository. Defaults to main
 * @returns GitHub raw URL
 */
const getRepoFile = async function (url) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("File Fetch Failed");

    // convert to blob to fix out-of-range latin characters
    const blob = await response.blob();
    const text = await blob.text();

    return {
      success: true,
      code: text,
    };
  } catch {
    console.warn(`Failed to fetch GitHub file: "${url}"`);
    return {
      success: false,
      code: "Failed to fetch file content!",
    };
  }
};

/**
 * Creates a Pull Request on a repository that adds/updates a set of compiled modules under a given directory.
 *
 * @param {String} org Organization name
 * @param {String} repo Repository name
 * @param {String} branch Branch to submit PR to (the base/target branch)
 * @param {String} token GitHub authorization token (needs repo write access)
 * @param {String} directory Directory to put the module scripts in
 * @param {Map<String, String>} modules Map of compiled modules
 * @returns {Promise<{success: boolean, msg: string, url: (string|undefined)}>}
 *   An object containing whether the operation succeeded, a message
 *   describing the result/error, and (on success) the URL of the new PR.
 */
const createModulePullRequest = async function (
  org,
  repo,
  branch,
  token,
  directory,
  modules,
) {
  const apiBase = `${GITHUB_API}/${org}/${repo}`;

  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
  };

  try {
    // 1. Get the latest commit SHA on the base branch
    const refResponse = await fetch(`${apiBase}/git/ref/heads/${branch}`, {
      headers,
    });
    if (!refResponse.ok) {
      throw new Error(`Failed to read base branch "${branch}"`);
    }

    const refData = await refResponse.json();
    const baseCommitSha = refData.object.sha;

    // Get the base commit to find its tree SHA
    const baseCommitResponse = await fetch(
      `${apiBase}/git/commits/${baseCommitSha}`,
      { headers },
    );
    if (!baseCommitResponse.ok) {
      throw new Error("Failed to read base commit");
    }

    const baseCommitData = await baseCommitResponse.json();
    const baseTreeSha = baseCommitData.tree.sha;

    // 2. Create a new branch off of the base commit
    const newBranchName = `InjectX-task-${Date.now()}`;
    const createBranchResponse = await fetch(`${apiBase}/git/refs`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        ref: `refs/heads/${newBranchName}`,
        sha: baseCommitSha,
      }),
    });
    if (!createBranchResponse.ok) {
      throw new Error("Failed to create new branch");
    }

    // 3. Create a blob for each module and build the tree entries
    const treeEntries = [];
    for (const [filename, code] of modules) {
      const blobResponse = await fetch(`${apiBase}/git/blobs`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          content: code,
          encoding: "utf-8",
        }),
      });
      if (!blobResponse.ok) {
        throw new Error(`Failed to create blob for "${filename}"`);
      }

      const blobData = await blobResponse.json();
      treeEntries.push({
        path: `${directory}${filename}`,
        mode: "100644",
        type: "blob",
        sha: blobData.sha,
      });
    }

    const treeResponse = await fetch(`${apiBase}/git/trees`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        base_tree: baseTreeSha,
        tree: treeEntries,
      }),
    });
    if (!treeResponse.ok) {
      throw new Error("Failed to create git tree");
    }

    const treeData = await treeResponse.json();

    // 4. Create a new commit pointing at the new tree
    const commitResponse = await fetch(`${apiBase}/git/commits`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        message: `Inject modules in /${directory}`,
        tree: treeData.sha,
        parents: [baseCommitSha],
      }),
    });
    if (!commitResponse.ok) {
      throw new Error("Failed to create commit");
    }

    const commitData = await commitResponse.json();

    // 5. Move the new branch's ref to point at the new commit
    const updateRefResponse = await fetch(
      `${apiBase}/git/refs/heads/${newBranchName}`,
      {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          sha: commitData.sha,
        }),
      },
    );
    if (!updateRefResponse.ok) {
      throw new Error("Failed to update new branch ref");
    }

    // 6. Open the Pull Request
    let prDescription = "## InjectX Task";
    prDescription += `\nThis PR adds the compiled output generated by **InjectX** to \`/${directory}\`.`;
    prDescription += "\n\n";
    prDescription += "### Modules\n";
    prDescription += [...modules.keys()]
      .map((filename) => `- \`${filename}\``)
      .join("\n");
    prDescription += "\n\n";
    prDescription += "> Automatically generated by **InjectX**.";

    const prResponse = await fetch(`${apiBase}/pulls`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        title: `InjectX Task: Add compiled modules`,
        head: newBranchName,
        base: branch,
        body: prDescription,
      }),
    });
    if (!prResponse.ok) {
      throw new Error("Failed to create pull request");
    }

    const prData = await prResponse.json();
    return {
      success: true,
      msg: "Pull request created successfully!",
      url: prData.html_url,
    };
  } catch (err) {
    return {
      success: false,
      msg: err.message,
    };
  }
};

export { genDirectoryContentApi, getRepoFile, createModulePullRequest };
