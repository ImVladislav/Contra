import Game from "./Game.js"
import * as PIXI from "../lib/pixi.mjs"
import AssetsFactory from "./AssetsFactory.js";

const gameViewport = document.createElement("div");
gameViewport.className = "game-viewport";

const pixiApp = new PIXI.Application({
    width: 1024,
    height: 768,
});

const manifest = await PIXI.Assets.load("./assets/sprites/manifest.json");
await PIXI.Assets.load(manifest.sprites.map((name) => `./assets/sprites/${name}.png`));

const assets = new AssetsFactory();

const game = new Game(pixiApp, assets);

gameViewport.appendChild(pixiApp.view);
document.body.appendChild(gameViewport);

document.addEventListener("keydown", (key) => game.keyboardProcessor.onKeyDown(key));
document.addEventListener("keyup", (key) => game.keyboardProcessor.onKeyUp(key));

const touchControls = document.createElement("div");
touchControls.className = "touch-controls";
touchControls.setAttribute("aria-label", "Мобільне керування");
touchControls.innerHTML = `
    <div class="touch-dpad" aria-label="Рух">
        <button class="touch-button touch-up-left" data-keys="ArrowUp,ArrowLeft" aria-label="Вгору і ліворуч">&#8598;</button>
        <button class="touch-button touch-up" data-keys="ArrowUp" aria-label="Вгору">&#9650;</button>
        <button class="touch-button touch-up-right" data-keys="ArrowUp,ArrowRight" aria-label="Вгору і праворуч">&#8599;</button>
        <button class="touch-button touch-left" data-keys="ArrowLeft" aria-label="Ліворуч">&#9664;</button>
        <button class="touch-button touch-down-left" data-keys="ArrowDown,ArrowLeft" aria-label="Вниз і ліворуч">&#8601;</button>
        <button class="touch-button touch-down" data-keys="ArrowDown" aria-label="Вниз">&#9660;</button>
        <button class="touch-button touch-down-right" data-keys="ArrowDown,ArrowRight" aria-label="Вниз і праворуч">&#8600;</button>
        <button class="touch-button touch-right" data-keys="ArrowRight" aria-label="Праворуч">&#9654;</button>
    </div>
    <div class="touch-actions">
        <button class="touch-button touch-start" data-keys="Enter" aria-label="Почати або підтвердити">START</button>
        <button class="touch-button touch-jump" data-keys="Space" aria-label="Стрибок">JUMP</button>
        <button class="touch-button touch-fire" data-keys="KeyA" aria-label="Стріляти">FIRE</button>
        <button class="touch-button touch-pause" data-keys="Escape" aria-label="Пауза">&#10074;&#10074;</button>
    </div>
`;
document.body.appendChild(touchControls);

const isTouchDevice = window.matchMedia("(pointer: coarse)").matches;
const orientationQuery = window.matchMedia("(orientation: landscape)");
const updateMobileOrientation = () => {
    if (isTouchDevice) {
        game.setMobileLandscape(orientationQuery.matches);
    }
};
orientationQuery.addEventListener?.("change", updateMobileOrientation);
orientationQuery.addListener?.(updateMobileOrientation);
window.addEventListener("orientationchange", updateMobileOrientation);
updateMobileOrientation();

const touchKeyPresses = new Map();
touchControls.querySelectorAll("[data-keys]").forEach((button) => {
    const keyCodes = button.dataset.keys.split(",");
    const pressedKeys = new Set();
    const press = (event) => {
        event.preventDefault();
        button.setPointerCapture?.(event.pointerId);
        keyCodes.forEach((keyCode) => {
            const presses = touchKeyPresses.get(keyCode) ?? 0;
            touchKeyPresses.set(keyCode, presses + 1);
            pressedKeys.add(keyCode);
            if (presses == 0) {
                game.keyboardProcessor.onKeyDown({ code: keyCode });
            }
        });
        button.classList.add("is-pressed");
    };
    const release = (event) => {
        event.preventDefault();
        pressedKeys.forEach((keyCode) => {
            const presses = Math.max((touchKeyPresses.get(keyCode) ?? 1) - 1, 0);
            touchKeyPresses.set(keyCode, presses);
            if (presses == 0) {
                game.keyboardProcessor.onKeyUp({ code: keyCode });
            }
        });
        pressedKeys.clear();
        button.classList.remove("is-pressed");
    };

    button.addEventListener("pointerdown", press);
    button.addEventListener("pointerup", release);
    button.addEventListener("pointercancel", release);
    button.addEventListener("lostpointercapture", release);
});

pixiApp.ticker.add(game.update, game);