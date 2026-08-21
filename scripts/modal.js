import { ioWrap } from "./utils.js";

class Modal extends HTMLElement {
  static TYPE_ALERT = 0;
  static TYPE_PROMPT = 1;

  /**
   * Creates a new modal of a specified type.
   *
   * @param {Modal.TYPE_ALERT|Modal.TYPE_PROMPT} type The type of modal
   * @param {String} title Title of modal
   * @param {String} content Content/description of modal
   * @returns New modal of specified type
   */
  static newModal(type, title, content) {
    const modal = document.createElement("x-modal");
    modal.setAttribute("type", type);
    modal.setAttribute("title", title);
    modal.innerHTML = content;

    document.body.append(modal);
    setTimeout(() => modal.setAttribute("showing", "true"));

    return modal;
  }

  constructor() {
    super();

    this._value = null;
    this._closeCallback = null;
  }

  connectedCallback() {
    const type = this.getAttribute("type");
    const title = this.getAttribute("title");
    const content = this.innerHTML;

    let dom = `<div class="modal-bg">`;
    dom += `<div class="content box">`;

    dom += `<div class="button-ui">`;
    dom += `<button class="modal-close">`;
    dom += `<img draggable="false" src="./assets/img/plus.svg">`;
    dom += `</button>`;
    dom += `</div>`;

    dom += `<h2 class="modal-title">${title}</h2>`;
    if (type == Modal.TYPE_PROMPT) {
      dom += `<div class="input-container">`;
      dom += "<label>";
      dom += `<span>${content}</span>`;
      dom += `<input class="input" type="text" placeholder="...">`;
      dom += "</label>";
      dom += `<button class="submit-btn btn-small">Submit</button>`;
      dom += `</div>`;
    } else {
      dom += `<div class="desc">${content}</div>`;
    }

    dom += `</div>`;
    dom += `</div>`;

    this.innerHTML = dom;
    this.removeAttribute("title");
    this._applyListeners();
  }

  /**
   * Closes the modal.
   */
  close() {
    this.removeAttribute("showing");
    this.addEventListener(
      "transitionend",
      () => {
        this.remove();
        if (this._closeCallback) this._closeCallback(this._value);
      },
      { once: true },
    );
  }

  /**
   * Initializes the click listeners for modal UI.
   *
   * @private
   */
  _applyListeners() {
    const closeBtn = this.querySelector(".modal-close");
    ioWrap(closeBtn, "click", () => this.close());

    const submitBtn = this.querySelector(".submit-btn");
    const input = this.querySelector(".input");
    if (input && submitBtn) {
      input.focus();
      ioWrap(submitBtn, "click", () => this.close());
      ioWrap(input, "input", () => {
        this._value = input.value;
      });
      ioWrap(input, "keydown", (e) => {
        if (e.key === "Enter") this.close();
      });
    }
  }
}

customElements.define("x-modal", Modal);

/**
 * Creates an alert modal.
 *
 * @param {String} title Title of modal
 * @param {String} content Content/description of modal
 * @returns Modal element
 */
const alert = function (title, content) {
  const modal = Modal.newModal(Modal.TYPE_ALERT, title, content);
  return modal;
};

/**
 * Creates a prompt modal.
 *
 * @param {String} title Title of modal
 * @param {String} content Content/description of modal
 * @returns {Promise<String>} prompt value
 */
const prompt = async function (title, content) {
  const modal = Modal.newModal(Modal.TYPE_PROMPT, title, content);
  return new Promise((resolve) => {
    modal._closeCallback = (value) => resolve(value);
  });
};

export { prompt, alert };
