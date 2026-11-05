const MODULE_ID = "greybeared-tiles";
const FLAG_SETPIECES = "setpieces";
const FLAG_AUTO_TILE_SORT = "autoTileSort";
const DEFAULT_START_PATH = "assets/artworks";
const DEFAULT_SETPIECE_ICON = "icons/svg/mystery-man.svg";
const FILE_PICKER_TYPE = "filePicker";
const SMART_PICKER_TYPE = "smartPicker";
const IMAGE_EXTENSIONS = [".apng", ".avif", ".bmp", ".gif", ".jpeg", ".jpg", ".png", ".svg", ".tiff", ".webp"];

let setpieceBar;
let setpieceConfig;
let smartPicker;
let smartPickerOpening = false;

class GBTMSetpieceBar extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "gbtm-setpiece-bar",
    classes: ["gbtm-setpiece-app"],
    window: {
      title: "Greybearded Tile Manager",
      frame: true,
      positioned: false
    },
    position: {
      top: 0,
      left: 0,
      width: "auto",
      height: "auto"
    },
    actions: {
      chooseSetpiece: GBTMSetpieceBar.#chooseSetpiece
    }
  };

  static PARTS = {
    main: {
      template: `modules/${MODULE_ID}/templates/setpiece-bar.hbs`
    }
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    return {
      ...context,
      setpieces: getSetpieces().map((setpiece, index) => ({
        ...setpiece,
        name: setpiece.name || `Setpiece ${index + 1}`,
        src: setpiece.src || DEFAULT_SETPIECE_ICON
      }))
    };
  }

  _onRender(context, options) {
    super._onRender(context, options);
    this.element.querySelectorAll(".gbtm-setpiece").forEach((button) => {
      button.addEventListener("click", () => this.constructor.#chooseSetpiece.call(this, null, button));
    });
    this.element.querySelector(".gbtm-close-setpieces")?.addEventListener("click", () => this.close());
    this.element.querySelector(".gbtm-clear-setpieces")?.addEventListener("click", () => clearSetpieces());
    this.element.querySelector(".gbtm-config-setpieces")?.addEventListener("click", () => openSetpieceConfig());
  }

  static async #chooseSetpiece(event, target) {
    const index = Number(target?.dataset?.index);
    if (!Number.isInteger(index)) return;

    const setpieces = getSetpieces();
    const setpiece = setpieces[index];
    if (!setpiece) return;
    if (setpiece.type === SMART_PICKER_TYPE) return openSmartPicker(index, setpiece);

    const sceneId = canvas.scene?.id;
    new FilePicker({
      type: "image",
      current: setpiece.src || DEFAULT_START_PATH,
      callback: async (path) => {
        await updateSetpiecePath(index, path, setpiece.tileId, sceneId);
      }
    }).render(true);
  }
}

class GBTMSmartPicker extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "gbtm-smart-picker",
    classes: ["gbtm-smart-picker-app"],
    window: { title: "SmartPicker", resizable: true },
    position: { width: 440, height: "auto" }
  };

  static PARTS = {
    main: { template: `modules/${MODULE_ID}/templates/smart-picker.hbs` }
  };

  constructor(index, setpiece, scene, files) {
    super();
    this.index = index;
    this.tileId = setpiece.tileId;
    this.sceneId = scene.id;
    this.name = setpiece.name || `Setpiece ${index + 1}`;
    this.current = setpiece.src;
    this.group = gbtmFirstWord(setpiece.src);
    this.files = files;
    this.showAll = false;
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const matches = this.files.map((path, index) => ({
      path,
      index,
      name: gbtmFilename(path),
      current: path === this.current
    })).filter((file) => this.showAll || gbtmFirstWord(file.path).toLocaleLowerCase() === this.group.toLocaleLowerCase());

    return {
      ...context,
      name: this.name,
      group: this.group || "aktuellem Bild",
      files: matches,
      showAll: this.showAll,
      hasFiles: this.files.length > 0
    };
  }

  _onRender(context, options) {
    super._onRender(context, options);
    this.element.querySelectorAll(".gbtm-smart-file").forEach((button) => {
      button.addEventListener("click", () => this._selectFile(button));
    });
    this.element.querySelector(".gbtm-smart-more")?.addEventListener("click", () => {
      this.showAll = true;
      this.render({ force: true });
    });
    this.element.querySelector(".gbtm-smart-less")?.addEventListener("click", () => {
      this.showAll = false;
      this.render({ force: true });
    });
  }

  async _selectFile(button) {
    if (this.saving) return;
    const path = this.files[Number(button.dataset.index)];
    if (!path) return;
    if (path === this.current) return this.close();

    this.saving = true;
    try {
      if (await updateSetpiecePath(this.index, path, this.tileId, this.sceneId)) await this.close();
    } finally {
      this.saving = false;
    }
  }
}

class GBTMSetpieceConfig extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "gbtm-setpiece-config",
    classes: ["gbtm-setpiece-config-app"],
    window: { title: "Setpieces konfigurieren", resizable: true },
    position: { width: 760, height: "auto" }
  };

  static PARTS = {
    main: { template: `modules/${MODULE_ID}/templates/setpiece-config.hbs` }
  };

  constructor(scene) {
    super();
    this.scene = scene;
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const setpieces = getSetpieces(this.scene);
    this.setpieceIds = setpieces.map((setpiece) => setpiece.tileId);
    return {
      ...context,
      setpieces: setpieces.map((setpiece, index) => ({
        ...setpiece,
        name: setpiece.name || `Setpiece ${index + 1}`,
        src: setpiece.src || DEFAULT_SETPIECE_ICON,
        filePickerSelected: !setpiece.type || setpiece.type === FILE_PICKER_TYPE,
        smartPickerSelected: setpiece.type === SMART_PICKER_TYPE
      }))
    };
  }

  _onRender(context, options) {
    super._onRender(context, options);
    this.element.querySelector(".gbtm-config-form")?.addEventListener("submit", (event) => this._save(event));
    this.element.querySelector(".gbtm-config-cancel")?.addEventListener("click", () => this.close());
  }

  async _save(event) {
    event.preventDefault();
    if (this.saving) return;
    if (canvas.scene?.id !== this.scene.id) {
      ui.notifications.warn("Die Szene hat sich geändert. Bitte die Konfiguration erneut öffnen.");
      return;
    }

    const setpieces = getSetpieces(this.scene);
    if (setpieces.length !== this.setpieceIds.length ||
        setpieces.some((setpiece, index) => setpiece.tileId !== this.setpieceIds[index])) {
      ui.notifications.warn("Die Setpiece-Liste hat sich geändert. Bitte die Konfiguration erneut öffnen.");
      return;
    }

    const form = event.currentTarget;
    for (const [index, setpiece] of setpieces.entries()) {
      const nameInput = form.elements.namedItem(`name-${index}`);
      const typeInput = form.elements.namedItem(`type-${index}`);
      const name = nameInput.value.trim();
      if (!name) {
        ui.notifications.warn("Bitte für jedes Setpiece einen Namen eingeben.");
        nameInput.focus();
        return;
      }
      setpiece.name = name;
      setpiece.type = typeInput.value;
    }

    this.saving = true;
    try {
      await this.scene.setFlag(MODULE_ID, FLAG_SETPIECES, setpieces);
      await this.close();
    } finally {
      this.saving = false;
    }
  }
}

Hooks.once("init", () => {
  console.log(`${MODULE_ID} | Initializing Greybearded Tile Manager`);
});

Hooks.on("getSceneControlButtons", (controls) => {
  const tokenTools = controls.tokens.tools;
  tokenTools.gbtmToggleSetpieces = {
    name: "gbtmToggleSetpieces",
    title: "GBTM: Setpiece-Leiste öffnen/schließen",
    icon: "fa-solid fa-images",
    order: Object.keys(tokenTools).length + 1,
    button: true,
    visible: game.user.isGM,
    onChange: () => toggleSetpieceBar()
  };

  const tileTools = controls.tiles.tools;
  tileTools.gbtmCreateSetpieceSlot = {
    name: "gbtmCreateSetpieceSlot",
    title: "GBTM: Setpiece-Slot aus ausgewählter Tile anlegen",
    icon: "fa-solid fa-square-plus",
    order: Object.keys(tileTools).length + 1,
    button: true,
    visible: game.user.isGM,
    onChange: () => createSetpieceFromControlledTile()
  };
  tileTools.gbtmAutoTileSort = {
    name: "gbtmAutoTileSort",
    title: "GBTM: Tiles automatisch nach ihrer vertikalen Position sortieren",
    icon: "fa-solid fa-arrow-down-short-wide",
    order: Object.keys(tileTools).length + 1,
    toggle: true,
    active: isAutomaticTileSortingEnabled(canvas.scene),
    visible: game.user.isGM,
    onChange: (_event, active) => toggleAutomaticTileSorting(active)
  };
});

Hooks.on("preCreateTile", (tile, data) => {
  if (!isAutomaticTileSortingEnabled(tile.parent)) return;
  tile.updateSource({ sort: getAutomaticTileSortValue(tile, data) });
});

Hooks.on("preUpdateTile", (tile, changes) => {
  if (!isAutomaticTileSortingEnabled(tile.parent) || !hasTileGeometryChange(changes)) return;
  changes.sort = getAutomaticTileSortValue(tile, changes);
});

Hooks.on("updateScene", (scene) => {
  if (scene.id === canvas.scene?.id && setpieceBar?.rendered) setpieceBar.render({ force: true });
});

function toggleSetpieceBar(active) {
  if (!setpieceBar) setpieceBar = new GBTMSetpieceBar();
  if (setpieceBar.rendered && active === false) return setpieceBar.close();
  if (setpieceBar.rendered) return setpieceBar.close();
  return setpieceBar.render(true);
}

function openSetpieceConfig() {
  if (!canvas.scene || setpieceConfig?.rendered) return;
  setpieceConfig = new GBTMSetpieceConfig(canvas.scene);
  return setpieceConfig.render(true);
}

async function openSmartPicker(index, setpiece) {
  if (smartPickerOpening || !canvas.scene) return;
  smartPickerOpening = true;
  const scene = canvas.scene;
  try {
    const { source, directory, bucket } = gbtmFileLocation(setpiece.src);
    const result = await foundry.applications.apps.FilePicker.implementation.browse(
      source, directory, { extensions: IMAGE_EXTENSIONS, ...(bucket ? { bucket } : {}) }
    );
    if (canvas.scene?.id !== scene.id) return;
    const files = (result.files ?? []).filter((path) => IMAGE_EXTENSIONS.some((ext) =>
      gbtmCleanPath(path).toLocaleLowerCase().endsWith(ext)
    )).sort((a, b) => gbtmFilename(a).localeCompare(gbtmFilename(b), undefined, { numeric: true }));
    if (smartPicker?.rendered) await smartPicker.close();
    smartPicker = new GBTMSmartPicker(index, setpiece, scene, files);
    await smartPicker.render(true);
  } catch (error) {
    console.error(`${MODULE_ID} | SmartPicker konnte den Ordner nicht lesen`, error);
    ui.notifications.error("SmartPicker konnte den Bildordner nicht lesen.");
  } finally {
    smartPickerOpening = false;
  }
}

function gbtmFileLocation(path) {
  const Picker = foundry.applications.apps.FilePicker.implementation;
  // Foundry infers the source and bucket from the current image URL, including legacy slots with a stale "data" flag.
  const picker = new Picker({ type: "image", current: path });
  const source = picker.activeSource;
  const directory = picker.target;
  const bucket = picker.source?.bucket;
  if (!source || typeof directory !== "string" || /^https?:\/\//iu.test(directory) ||
      (source === "s3" && !bucket) ||
      (/^https?:\/\//iu.test(path) && ["data", "public"].includes(source))) {
    throw new Error(`Speicherort des Bildes kann nicht durchsucht werden: ${path}`);
  }
  return { source, directory, bucket };
}

function gbtmCleanPath(path) {
  return String(path ?? "").split(/[?#]/u, 1)[0];
}

function gbtmFilename(path) {
  const name = gbtmCleanPath(path).split("/").at(-1) || "";
  try { return decodeURIComponent(name); }
  catch { return name; }
}

function gbtmFirstWord(path) {
  return gbtmFilename(path).replace(/\.[^.]+$/u, "").trim().split(/[\s_-]+/u, 1)[0];
}

function isAutomaticTileSortingEnabled(scene) {
  return scene?.getFlag(MODULE_ID, FLAG_AUTO_TILE_SORT) === true;
}

function hasTileGeometryChange(changes) {
  return ["y", "height"].some((property) => foundry.utils.hasProperty(changes, property));
}

function getAutomaticTileSortValue(tile, changes = {}) {
  const y = Number(foundry.utils.getProperty(changes, "y") ?? tile.y ?? 0);
  const height = Number(foundry.utils.getProperty(changes, "height") ?? tile.height ?? 0);
  return Math.round(y + Math.abs(height));
}

async function toggleAutomaticTileSorting(active) {
  const scene = canvas.scene;
  if (!scene) return;

  if (!active) {
    await scene.unsetFlag(MODULE_ID, FLAG_AUTO_TILE_SORT);
    return ui.notifications.info("Automatische Tile-Sortierung für diese Szene deaktiviert.");
  }

  await scene.setFlag(MODULE_ID, FLAG_AUTO_TILE_SORT, true);
  const updatedTiles = await sortSceneTiles(scene);
  ui.notifications.info(`Automatische Tile-Sortierung aktiviert; ${updatedTiles} Tiles sortiert.`);
}

async function sortSceneTiles(scene) {
  const updates = scene.tiles.reduce((result, tile) => {
    const sort = getAutomaticTileSortValue(tile);
    if (tile.sort !== sort) result.push({ _id: tile.id, sort });
    return result;
  }, []);

  if (updates.length) await scene.updateEmbeddedDocuments("Tile", updates);
  return updates.length;
}

async function createSetpieceFromControlledTile() {
  const tile = canvas.tiles?.controlled?.[0];
  if (!tile) {
    return ui.notifications.warn("Bitte zuerst genau eine Tile auswählen.");
  }

  const document = tile.document;
  const setpieces = getSetpieces();
  const existingIndex = setpieces.findIndex((setpiece) => setpiece.tileId === document.id || setpiece.tileUuid === document.uuid);
  if (existingIndex >= 0) {
    const [removedSetpiece] = setpieces.splice(existingIndex, 1);
    await canvas.scene.setFlag(MODULE_ID, FLAG_SETPIECES, setpieces);
    ui.notifications.info(`Setpiece entfernt: ${removedSetpiece.name || document.name || document.id}`);
    if (setpieceBar?.rendered) setpieceBar.render({ force: true });
    return;
  }

  const fallbackName = document.name || `Setpiece ${setpieces.length + 1}`;
  const name = await promptSetpieceName(fallbackName);
  if (!name) return;

  const src = document.texture?.src || "";
  setpieces.push({
    tileId: document.id,
    tileUuid: document.uuid,
    sceneId: canvas.scene.id,
    name,
    type: FILE_PICKER_TYPE,
    src
  });

  await canvas.scene.setFlag(MODULE_ID, FLAG_SETPIECES, setpieces);
  ui.notifications.info(`Setpiece-Slot angelegt: ${name}`);
  if (setpieceBar?.rendered) setpieceBar.render({ force: true });
}

async function promptSetpieceName(defaultName) {
  const data = await foundry.applications.api.DialogV2.input({
    window: { title: "Setpiece benennen" },
    content: `
      <div class="form-group">
        <label for="gbtm-setpiece-name">Name</label>
        <input id="gbtm-setpiece-name" type="text" name="name" value="${gbtmEscapeAttribute(defaultName)}" autofocus>
      </div>
    `,
    ok: {
      label: "Speichern",
      icon: "fa-solid fa-floppy-disk"
    },
    rejectClose: false
  });

  if (!data) return null;

  const name = data.name?.trim();
  if (!name) {
    ui.notifications.warn("Bitte einen Namen für das Setpiece eingeben.");
    return null;
  }

  return name;
}

function gbtmEscapeAttribute(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function getSetpieces(scene = canvas.scene) {
  return foundry.utils.deepClone(scene?.getFlag(MODULE_ID, FLAG_SETPIECES) ?? []);
}

async function clearSetpieces() {
  await canvas.scene.setFlag(MODULE_ID, FLAG_SETPIECES, []);
  ui.notifications.info("Setpiece-Liste geleert.");
  if (setpieceBar?.rendered) setpieceBar.render({ force: true });
}

async function updateSetpiecePath(index, path, tileId, sceneId) {
  if (canvas.scene?.id !== sceneId) return false;
  const setpieces = getSetpieces();
  const setpiece = setpieces[index];
  if (!setpiece || setpiece.tileId !== tileId) {
    ui.notifications.warn("Die Setpiece-Liste hat sich geändert. Bitte die Auswahl erneut öffnen.");
    return false;
  }

  const tile = canvas.scene.tiles.get(setpiece.tileId);
  if (!tile) {
    ui.notifications.error(`Tile nicht gefunden: ${setpiece.tileId}`);
    return false;
  }

  await tile.update({ "texture.src": path });
  setpiece.src = path;
  delete setpiece.source;
  delete setpiece.bucket;
  await canvas.scene.setFlag(MODULE_ID, FLAG_SETPIECES, setpieces);
  ui.notifications.info(`Setpiece gewechselt: ${path}`);
  if (setpieceBar?.rendered) setpieceBar.render({ force: true });
  return true;
}
