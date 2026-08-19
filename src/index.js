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
        <button class="touch-button touch-up" data-key="ArrowUp" aria-label="Вгору">&#9650;</button>
        <button class="touch-button touch-left" data-key="ArrowLeft" aria-label="Ліворуч">&#9664;</button>
        <button class="touch-button touch-down" data-key="ArrowDown" aria-label="Вниз">&#9660;</button>
        <button class="touch-button touch-right" data-key="ArrowRight" aria-label="Праворуч">&#9654;</button>
    </div>
    <div class="touch-actions">
        <button class="touch-button touch-start" data-key="Enter" aria-label="Почати або підтвердити">START</button>
        <button class="touch-button touch-jump" data-key="Space" aria-label="Стрибок">JUMP</button>
        <button class="touch-button touch-fire" data-key="KeyA" aria-label="Стріляти">FIRE</button>
        <button class="touch-button touch-pause" data-key="Escape" aria-label="Пауза">&#10074;&#10074;</button>
    </div>
`;
document.body.appendChild(touchControls);

touchControls.querySelectorAll("[data-key]").forEach((button) => {
    const keyCode = button.dataset.key;
    const press = (event) => {
        event.preventDefault();
        button.setPointerCapture?.(event.pointerId);
        game.keyboardProcessor.onKeyDown({ code: keyCode });
        button.classList.add("is-pressed");
    };
    const release = (event) => {
        event.preventDefault();
        game.keyboardProcessor.onKeyUp({ code: keyCode });
        button.classList.remove("is-pressed");
    };

    button.addEventListener("pointerdown", press);
    button.addEventListener("pointerup", release);
    button.addEventListener("pointercancel", release);
    button.addEventListener("lostpointercapture", release);
});

pixiApp.ticker.add(game.update, game);