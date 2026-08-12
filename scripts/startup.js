/* global Events */
const themeButton = document.getElementById("theme-btn");

const updateThemeIcon = function (mode) {
  const icon = themeButton.firstElementChild;
  icon.src = `./assets/img/${mode}.svg`;
};

themeButton.addEventListener("click", (e) => {
  const body = document.body;
  const mode = body.dataset.mode === "light" ? "dark" : "light";

  body.dataset.mode = mode;
  updateThemeIcon(mode);
  Events.emit("THEME_CHANGED", mode);
  localStorage.setItem("InjectX-theme", mode);
});

document.addEventListener("DOMContentLoaded", () => {
  const body = document.body;
  const theme = localStorage.getItem("InjectX-theme");
  if (theme) {
    body.dataset.mode = theme;
    updateThemeIcon(theme);
  }
});
