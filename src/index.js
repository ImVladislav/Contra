import Game from "./Game.js?v=9"
import * as PIXI from "../lib/pixi.mjs"
import AssetsFactory from "./AssetsFactory.js";

const gameViewport = document.createElement("div");
gameViewport.className = "game-viewport";

// Retro look: no texture smoothing, pixels stay crisp when scaled.
PIXI.BaseTexture.defaultOptions.scaleMode = PIXI.SCALE_MODES.NEAREST;

// The game is always 768 units tall. On a PC the view is the classic 4:3
// (1024 wide); on a phone it is as wide as the phone's landscape screen, so
// the picture fills the whole display instead of sitting in a small 4:3 box
// with black bars (the camera, menus and background all read this width).
const GAME_HEIGHT = 768;
const computeGameWidth = () => {
    if (!window.matchMedia("(pointer: coarse)").matches) {
        return 1024;
    }
    const longSide = Math.max(window.innerWidth, window.innerHeight);
    const shortSide = Math.min(window.innerWidth, window.innerHeight);
    const aspect = longSide / Math.max(shortSide, 1);
    const width = Math.min(Math.max(GAME_HEIGHT * aspect, 1024), 1824);
    return Math.round(width / 2) * 2;
};
let GAME_WIDTH = computeGameWidth();
globalThis.GAME_WIDTH = GAME_WIDTH;

const pixiApp = new PIXI.Application({
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
});

// Fit the view into what is really visible: the visual viewport (without
// the browser's bars) minus the notch / rounded-corner safe areas, so no
// edge of the game is ever cut off.
const fitGameViewport = () => {
    const bodyStyle = getComputedStyle(document.body);
    const insetX = parseFloat(bodyStyle.paddingLeft) + parseFloat(bodyStyle.paddingRight);
    const insetY = parseFloat(bodyStyle.paddingTop) + parseFloat(bodyStyle.paddingBottom);
    const visible = window.visualViewport;
    const availWidth = (visible ? visible.width : window.innerWidth) - insetX;
    const availHeight = (visible ? visible.height : window.innerHeight) - insetY;
    const aspect = GAME_WIDTH / GAME_HEIGHT;
    let width = availWidth;
    let height = width / aspect;
    if (height > availHeight) {
        height = availHeight;
        width = height * aspect;
    }
    gameViewport.style.width = `${Math.floor(width)}px`;
    gameViewport.style.height = `${Math.floor(height)}px`;
};
// On every resize: re-pick the game width (phone <-> PC, rotation, browser
// bars, dev-tools device mode) and re-fit the view.
let game;
const onViewportChange = () => {
    const width = computeGameWidth();
    if (game && Math.abs(width - GAME_WIDTH) > 8) {
        GAME_WIDTH = width;
        globalThis.GAME_WIDTH = width;
        game.resizeView(width);
    }
    fitGameViewport();
};
window.addEventListener("resize", onViewportChange);
window.addEventListener("orientationchange", () => setTimeout(onViewportChange, 250));
window.visualViewport?.addEventListener("resize", onViewportChange);

const manifest = await PIXI.Assets.load("./assets/sprites/manifest.json");
await PIXI.Assets.load(manifest.sprites.map((name) => `./assets/sprites/${name}.png`));

const assets = new AssetsFactory();

game = new Game(pixiApp, assets);

gameViewport.appendChild(pixiApp.view);
document.body.appendChild(gameViewport);
fitGameViewport();

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
        <button class="touch-button touch-jump" data-keys="Space" aria-label="Стрибок">JUMP</button>
        <button class="touch-button touch-fire" data-keys="KeyA" aria-label="Стріляти">FIRE</button>
        <button class="touch-button touch-pause" data-keys="Escape" aria-label="Пауза">ПАУЗА</button>
    </div>
`;
document.body.appendChild(touchControls);

const isTouchDevice = window.matchMedia("(pointer: coarse)").matches;

// Best-effort fullscreen for phones playing in an ordinary browser tab
// (not installed to the home screen): the Fullscreen API needs a genuine
// user gesture, so it's requested on the very first tap. It won't hide the
// address bar on every browser (notably iOS Safari), but it's a free extra
// on ones that do support it (Android Chrome and friends) - the manifest
// + "Add to Home Screen" route above is what reliably removes the bar
// everywhere.
if (isTouchDevice) {
    const requestFullscreenOnce = () => {
        document.documentElement.requestFullscreen?.().catch(() => {});
        document.removeEventListener("pointerdown", requestFullscreenOnce);
    };
    document.addEventListener("pointerdown", requestFullscreenOnce, { once: true });
}

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

// Secret code: FIRE x4, then JUMP x4 (taps less than 2 s apart) switches on
// "Непереможний Дев'ятий" (god mode) - the phone/tablet replacement for the
// "Безсмертя" checkbox.
const CHEAT_CODE = ["fire", "fire", "fire", "fire", "jump", "jump", "jump", "jump"];
let cheatTaps = [];
let lastCheatTap = 0;
const registerCheatTap = (button) => {
    const name = button.classList.contains("touch-fire") ? "fire" : button.classList.contains("touch-jump") ? "jump" : "other";
    const now = performance.now();
    if (now - lastCheatTap > 2000) {
        cheatTaps = [];
    }
    lastCheatTap = now;
    cheatTaps.push(name);
    cheatTaps = cheatTaps.slice(-CHEAT_CODE.length);
    if (cheatTaps.length == CHEAT_CODE.length && cheatTaps.every((tap, i) => tap == CHEAT_CODE[i])) {
        cheatTaps = [];
        game.enableInvincibleCheat();
    }
};

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
    button.addEventListener("pointerdown", () => registerCheatTap(button));
    button.addEventListener("pointerup", release);
    button.addEventListener("pointercancel", release);
    button.addEventListener("lostpointercapture", release);
});

pixiApp.ticker.add(game.update, game);

// Menus are driven by tapping the items, so the stick and buttons only show
// while actually playing.
let lastMenuState;
pixiApp.ticker.add(() => {
    const inMenu = game.menuMode != "playing";
    if (inMenu !== lastMenuState) {
        lastMenuState = inMenu;
        touchControls.classList.toggle("is-menu", inMenu);
        if (inMenu) {
            joystickKeys.forEach(releaseTouchKey);
            joystickKeys = new Set();
            joystickKnob.style.transform = "translate(-50%, -50%)";
        }
    }
});