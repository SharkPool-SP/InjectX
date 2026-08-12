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

export { genDirectoryContentApi, getRepoFile };
