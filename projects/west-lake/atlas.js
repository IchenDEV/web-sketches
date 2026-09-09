import { collections, destinations, destinationOrder } from "./catalog.js";

// Native dialog supplies focus trapping, Escape and focus restoration.
export function createAtlas(onChoose) {
  const select = document.querySelector("#destination");
  const dialog = document.querySelector("#atlas");
  const content = document.querySelector("#atlas-collections");
  const opener = document.querySelector("#open-atlas");
  const buttons = new Map();
  let current = "three-pools";
  select.replaceChildren();
  for (const collection of collections) {
    const optgroup = document.createElement("optgroup");
    optgroup.label = `${collection.title} · ${collection.era}`;
    const section = document.createElement("section");
    const heading = document.createElement("h3");
    heading.textContent = collection.title;
    const era = document.createElement("span");
    era.textContent = collection.era;
    heading.append(era);
    const description = document.createElement("p");
    description.textContent = collection.description;
    const grid = document.createElement("div");
    grid.className = "atlas-grid";
    for (const [index, id] of collection.ids.entries()) {
      const config = destinations[id];
      optgroup.append(new Option(config.title, id));
      const button = document.createElement("button");
      button.dataset.destination = id;
      const number = document.createElement("span");
      number.className = "atlas-number";
      number.textContent = String(index + 1).padStart(2, "0");
      const title = document.createElement("strong");
      title.textContent = config.title;
      const subtitle = document.createElement("small");
      subtitle.textContent = config.subtitle;
      const preview = document.createElement("img");
      preview.dataset.src = `${import.meta.env.BASE_URL}assets/previews/${id}.webp`;
      preview.alt = "";
      preview.width = 600;
      preview.height = 200;
      preview.loading = "lazy";
      preview.decoding = "async";
      const caption = document.createElement("div");
      caption.className = "atlas-caption";
      caption.append(number, title, subtitle);
      button.append(preview, caption);
      button.onclick = () => {
        dialog.close();
        onChoose(id);
      };
      buttons.set(id, button);
      grid.append(button);
    }
    section.append(heading, description, grid);
    content.append(section);
    select.append(optgroup);
  }
  opener.onclick = () => {
    // Opening the atlas requests small previews, never full scene textures.
    for (const image of content.querySelectorAll("img[data-src]")) {
      image.src = image.dataset.src;
      delete image.dataset.src;
    }
    dialog.showModal();
  };
  document.querySelector("#close-atlas").onclick = () => dialog.close();
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) {
      const rect = dialog.getBoundingClientRect();
      if (
        event.clientX < rect.left ||
        event.clientX > rect.right ||
        event.clientY < rect.top ||
        event.clientY > rect.bottom
      )
        dialog.close();
    }
  });
  for (const [buttonId, offset] of [
    ["previous-scene", -1],
    ["next-scene", 1],
  ]) {
    document.getElementById(buttonId).onclick = () => {
      const index = destinationOrder.indexOf(current);
      onChoose(
        destinationOrder[
          (index + offset + destinationOrder.length) % destinationOrder.length
        ],
      );
    };
  }
  return (id) => {
    current = id;
    const index = destinationOrder.indexOf(id);
    const collection = collections.find((group) => group.ids.includes(id));
    document.querySelector("#scene-position").textContent =
      `${collection.title} · ${String(index + 1).padStart(2, "0")} / 30`;
    for (const [key, button] of buttons) {
      if (key === id) button.setAttribute("aria-current", "true");
      else button.removeAttribute("aria-current");
    }
    for (const [buttonId, offset, label] of [
      ["previous-scene", -1, "上一景"],
      ["next-scene", 1, "下一景"],
    ]) {
      const nextId =
        destinationOrder[
          (index + offset + destinationOrder.length) % destinationOrder.length
        ];
      document
        .getElementById(buttonId)
        .setAttribute("aria-label", `${label}：${destinations[nextId].title}`);
    }
  };
}
