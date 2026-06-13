const MODULE_ID = "greybeared-tiles";
const FLAG_SETPIECES = "setpieces";
const DEFAULT_FILE_SOURCE = "data";
const DEFAULT_START_PATH = "assets/artworks";

let setpieceBar;

class GBTMSetpieceBar extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "gbtm-setpiece-bar",
    classes: ["gbtm-setpiece-app"],
    window: {
      title: "Greybeared Theater of the Mind",
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
        src: setpiece.src || "icons/svg/mystery-man.svg"
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
  }

  static async #chooseSetpiece(event, target) {
    const index = Number(target?.dataset?.index);
    if (!Number.isInteger(index)) return;

    const setpieces = getSetpieces();
    const setpiece = setpieces[index];
    if (!setpiece) return;

    const current = setpiece.src || DEFAULT_START_PATH;
    new FilePicker({
      type: "image",
      source: setpiece.source || DEFAULT_FILE_SOURCE,
      current,
      callback: async (path) => {
        await updateSetpiecePath(index, path);
      }
    }).render(true);
  }
}

Hooks.once("init", () => {
  console.log(`${MODULE_ID} | Initializing Greybeared Theater of the Mind`);
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

  const src = document.texture?.src || "";
  setpieces.push({
    tileId: document.id,
    tileUuid: document.uuid,
    sceneId: canvas.scene.id,
    name: document.name || `Setpiece ${setpieces.length + 1}`,
    src,
    source: DEFAULT_FILE_SOURCE
  });

  await canvas.scene.setFlag(MODULE_ID, FLAG_SETPIECES, setpieces);
  ui.notifications.info(`Setpiece-Slot angelegt: ${document.name || document.id}`);
  if (setpieceBar?.rendered) setpieceBar.render({ force: true });
}

function getSetpieces() {
  return foundry.utils.deepClone(canvas.scene?.getFlag(MODULE_ID, FLAG_SETPIECES) ?? []);
}

async function clearSetpieces() {
  await canvas.scene.setFlag(MODULE_ID, FLAG_SETPIECES, []);
  ui.notifications.info("Setpiece-Liste geleert.");
  if (setpieceBar?.rendered) setpieceBar.render({ force: true });
}

async function updateSetpiecePath(index, path) {
  const setpieces = getSetpieces();
  const setpiece = setpieces[index];
  if (!setpiece) return;

  const tile = canvas.scene.tiles.get(setpiece.tileId);
  if (!tile) {
    return ui.notifications.error(`Tile nicht gefunden: ${setpiece.tileId}`);
  }

  await tile.update({ "texture.src": path });
  setpiece.src = path;
  await canvas.scene.setFlag(MODULE_ID, FLAG_SETPIECES, setpieces);
  ui.notifications.info(`Setpiece gewechselt: ${path}`);
  if (setpieceBar?.rendered) setpieceBar.render({ force: true });
}
