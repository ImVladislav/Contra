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
    <div class="touch-joystick" aria-label="Віртуальний джойстик">
        <div class="touch-stick"><div class="touch-stick-knob"></div></div>
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
const pressTouchKey = (keyCode) => {
    const presses = touchKeyPresses.get(keyCode) ?? 0;
    touchKeyPresses.set(keyCode, presses + 1);
    if (presses == 0) {
        game.keyboardProcessor.onKeyDown({ code: keyCode });
    }
};
const releaseTouchKey = (keyCode) => {
    const presses = Math.max((touchKeyPresses.get(keyCode) ?? 1) - 1, 0);
    touchKeyPresses.set(keyCode, presses);
    if (presses == 0) {
        game.keyboardProcessor.onKeyUp({ code: keyCode });
    }
};

const joystick = touchControls.querySelector(".touch-joystick");
const joystickKnob = touchControls.querySelector(".touch-stick-knob");
let joystickPointerId;
let joystickKeys = new Set();
const updateJoystick = (event) => {
    const bounds = joystick.getBoundingClientRect();
    const centerX = bounds.left + bounds.width / 2;
    const centerY = bounds.top + bounds.height / 2;
    const maxDistance = bounds.width * 0.3;
    const deltaX = event.clientX - centerX;
    const deltaY = event.clientY - centerY;
    const distance = Math.min(Math.hypot(deltaX, deltaY), maxDistance);
    const angle = Math.atan2(deltaY, deltaX);
    const knobX = Math.cos(angle) * distance;
    const knobY = Math.sin(angle) * distance;
    joystickKnob.style.transform = `translate(calc(-50% + ${knobX}px), calc(-50% + ${knobY}px))`;

    const nextKeys = new Set();
    if (distance > bounds.width * 0.12) {
        if (Math.abs(deltaX) > bounds.width * 0.12) {
            nextKeys.add(deltaX < 0 ? "ArrowLeft" : "ArrowRight");
        }
        if (Math.abs(deltaY) > bounds.width * 0.12) {
            nextKeys.add(deltaY < 0 ? "ArrowUp" : "ArrowDown");
        }
    }
    joystickKeys.forEach((keyCode) => {
        if (!nextKeys.has(keyCode)) {
            releaseTouchKey(keyCode);
        }
    });
    nextKeys.forEach((keyCode) => {
        if (!joystickKeys.has(keyCode)) {
            pressTouchKey(keyCode);
        }
    });
    joystickKeys = nextKeys;
};
const releaseJoystick = (event) => {
    if (event.pointerId != joystickPointerId) {
        return;
    }
    joystickKeys.forEach(releaseTouchKey);
    joystickKeys = new Set();
    joystickPointerId = undefined;
    joystickKnob.style.transform = "translate(-50%, -50%)";
};
joystick.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    joystickPointerId = event.pointerId;
    joystick.setPointerCapture?.(event.pointerId);
    updateJoystick(event);
});
joystick.addEventListener("pointermove", (event) => {
    if (event.pointerId == joystickPointerId) {
        event.preventDefault();
        updateJoystick(event);
    }
});
joystick.addEventListener("pointerup", releaseJoystick);
joystick.addEventListener("pointercancel", releaseJoystick);
joystick.addEventListener("lostpointercapture", releaseJoystick);

touchControls.querySelectorAll(".touch-actions [data-keys]").forEach((button) => {
    const keyCodes = button.dataset.keys.split(",");
    const pressedKeys = new Set();
    const press = (event) => {
        event.preventDefault();
        button.setPointerCapture?.(event.pointerId);
        keyCodes.forEach((keyCode) => {
            pressedKeys.add(keyCode);
            pressTouchKey(keyCode);
        });
        button.classList.add("is-pressed");
    };
    const release = (event) => {
        event.preventDefault();
        pressedKeys.forEach((keyCode) => {
            releaseTouchKey(keyCode);
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