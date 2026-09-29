import { AnimatedSprite, Container, Graphics, Sprite, Text, TextStyle } from "../lib/pixi.mjs";
import Camera from "./Camera.js?v=8";
import BulletFactory from "./Entities/Bullets/BulletFactory.js?v=8";
import EnemiesFactory from "./Entities/Enemies/EnemiesFactory.js";
import HeroFactory from "./Entities/Hero/HeroFactory.js?v=9";
import PlatformFactory from "./Entities/Platforms/PlatformFactory.js";
import PowerupsFactory from "./Entities/Powerups/PowerupsFactory.js";
import KeyboardProcessor from "./KeyboardProcessor.js";
import Physics from "./Physics.js";
import SceneFactory from "./SceneFactory.js";
import StaticBackground from "./StaticBackground.js";
import Weapon from "./Weapon.js";
import World from "./World.js";

export default class Game {

    #pixiApp;
    #hero;
    #platforms = [];
    #entities = [];
    #camera;
    #bulletFactory;
    #runnerFactory;
    #worldContainer;
    #weapon;
    #isEndGame = false;
    #assets;
    #menuContainer;
    #menuMode = "main";
    #selectedMenuOption = 0;
    // One hero: the paratrooper with the callsign "Дев'ятий".
    #characters = ["Дев'ятий"];
    #orientationReturnMode = "main";
    #heroIntroOverlay;
    #isGodModeEnabled = false;
    #lives = 3;
    #livesText;
    #statusText;
    #activeCharacterIndex = 0;
    #endingTick;
    #seaDroneTick;
    #seaDroneCleanup;
    #background;
    #isTouch = window.matchMedia("(pointer: coarse)").matches;
    // Phones/tablets: the canvas is as wide as the phone, but the camera is
    // zoomed so that exactly the standard 1024 world units fit across it -
    // the same view width as on a PC (enemies wake up at 720 units from the
    // hero, so a wider view showed them standing still at the edges). The
    // camera also follows the hero up and down there.
    #getZoom() {
        return this.#isTouch ? this.#pixiApp.screen.width / 1024 : 1;
    }

    keyboardProcessor;

    // index.js hides the on-screen stick/buttons whenever this isn't "playing"
    get menuMode() {
        return this.#menuMode;
    }

    constructor(pixiApp, assets) {
        this.#pixiApp = pixiApp;
        this.#assets = assets;

        this.#background = new StaticBackground(this.#pixiApp.screen, assets);
        this.#pixiApp.stage.addChild(this.#background);

        // Touch: tapping anywhere skips the ending scene / closes the credits
        // (menu items have their own tap handlers).
        this.#pixiApp.stage.eventMode = "static";
        this.#pixiApp.stage.hitArea = this.#pixiApp.screen;
        this.#pixiApp.stage.on("pointertap", () => {
            if (this.#menuMode == "cutscene" || this.#menuMode == "credits") {
                this.#handleMenuKey("Enter");
            }
        });

        this.keyboardProcessor = new KeyboardProcessor(this);
        this.setKeys();
        this.#showMainMenu();
    }

    update(delta = 1){
        if (this.#menuMode != "playing") {
            return;
        }

        for(let i = 0; i < this.#entities.length; i++){
            const entity = this.#entities[i];
            entity.update(delta);

            if(entity.type == "hero" || entity.type == "enemy" || entity.type == "powerupBox" || entity.type == "spreadgunPowerup" || entity.type == "weaponPowerup"){
                this.#checkDamage(entity);
                this.#checkPlatforms(entity);
            }

            if (this.#checkEntityStatus(entity, i)) {
                i--;
            }
        }

        this.#camera.update();
        if (!this.#hero.isDiving) {
            this.#weapon.update(this.#hero.bulletContext, delta);
        }

        this.#checkGameStatus();
    }

    // Secret code on the touch buttons: "Непереможний Дев'ятий".
    enableInvincibleCheat() {
        this.#isGodModeEnabled = true;
        if (this.#hero && !this.#hero.isDead) {
            this.#hero.setGodMode(true);
        }
        const checkbox = document.querySelector("#game-godmode-checkbox input");
        if (checkbox) {
            checkbox.checked = true;
        }
        this.#showCheatModal();
    }

    #showCheatModal() {
        document.getElementById("cheat-modal")?.remove();
        const modal = document.createElement("div");
        modal.id = "cheat-modal";
        modal.className = "cheat-modal";
        modal.innerHTML = `
            <div class="cheat-modal__card">
                <div class="cheat-modal__icon">9</div>
                <div class="cheat-modal__title">Режим «Непереможний Дев'ятий»</div>
                <div class="cheat-modal__text">Увімкнено. Кулі й вороги більше не страшні.</div>
            </div>
        `;
        const close = () => modal.remove();
        modal.addEventListener("pointerdown", close);
        document.body.appendChild(modal);
        window.setTimeout(close, 2800);
    }

    // The view got a new width (see index.js): rebuild what depends on it.
    resizeView(width) {
        this.#pixiApp.renderer.resize(width, this.#pixiApp.screen.height);
        const index = this.#pixiApp.stage.getChildIndex(this.#background);
        this.#background.destroy({ children: true });
        this.#background = new StaticBackground(this.#pixiApp.screen, this.#assets);
        this.#pixiApp.stage.addChildAt(this.#background, index);
        globalThis.GAME_ZOOM = this.#getZoom();
        this.#camera?.resize?.(width, this.#getZoom());

        if (this.#menuMode == "main") {
            const selected = this.#selectedMenuOption;
            this.#showMainMenu();
            this.#selectedMenuOption = selected;
            this.#updateMenuSelection(this.#menuContainer, this.#menuContainer.optionCount);
        }
        else if (this.#menuMode == "briefing") {
            this.#showBriefing();
        }
        else if (this.#menuMode == "pause") {
            this.#menuContainer?.destroy({ children: true });
            this.#showPauseMenu();
        }
        else if (this.#menuMode == "orientation") {
            this.#showOrientationMenu();
        }
    }

    // Touch: tapping a menu item selects and confirms it in one go.
    #makeMenuTap(target, index) {
        target.eventMode = "static";
        target.cursor = "pointer";
        target.on("pointertap", (event) => {
            event.stopPropagation();
            const menu = this.#menuContainer;
            if (!menu || menu.destroyed) {
                return;
            }
            this.#selectedMenuOption = index;
            this.#updateMenuSelection(menu, menu.optionCount);
            this.#handleMenuKey("Enter");
        });
    }

    // A transparent tappable rectangle (bigger than the text itself).
    #addMenuHitArea(container, index, x, y, width, height) {
        const hit = new Graphics();
        hit.beginFill(0xffffff, 0.001).drawRect(x, y, width, height).endFill();
        container.addChild(hit);
        this.#makeMenuTap(hit, index);
    }

    setMobileLandscape(isLandscape) {
        if (isLandscape) {
            if (this.#menuMode != "orientation") {
                return;
            }

            if (this.#orientationReturnMode == "playing" || this.#orientationReturnMode == "pause") {
                this.#showPauseMenu();
            }
            else {
                this.#showMainMenu();
            }
            return;
        }

        if (this.#menuMode == "orientation") {
            return;
        }

        this.keyboardProcessor.releaseAll();
        this.#orientationReturnMode = this.#menuMode;
        this.#showOrientationMenu();
    }

    #startGame() {
        this.#menuContainer?.destroy({ children: true });
        this.#menuContainer = undefined;
        this.#menuMode = "playing";
        this.#isEndGame = false;
        this.#platforms = [];
        this.#entities = [];

        globalThis.GAME_VIEW = undefined;
        this.#worldContainer = new World();
        // Whole level drawn 64px higher on screen: a much wider band of river
        // shows under the islands (88px instead of 24) while the level layout
        // itself stays exactly the same.
        this.#worldContainer.y = -64;
        this.#pixiApp.stage.addChild(this.#worldContainer);
        this.#bulletFactory = new BulletFactory(this.#worldContainer.game, this.#entities);

        const heroFactory = new HeroFactory(this.#worldContainer.game, this.#assets);
        // The mission opens with a night drop: the hero comes down from above
        // the screen under a parachute and lands on the first island.
        this.#hero = heroFactory.create(160, -60);
        this.#hero.deployParachute();
        this.#entities.push(this.#hero);
        this.#hero._view.setTint(this.#getSelectedProfile().tint);
        if (this.#isGodModeEnabled) {
            this.#hero.setGodMode(true);
        }
        else {
            this.#hero.setInvulnerable(3);
        }
        this.#showHeroIntro();

        const enemyFactory = new EnemiesFactory(this.#worldContainer.game, this.#hero, this.#bulletFactory, this.#entities, this.#assets);
        const platformFactory = new PlatformFactory(this.#worldContainer, this.#assets);
        const powerupFactory = new PowerupsFactory(this.#entities, this.#assets, this.#worldContainer.game, this.#hero);
        const sceneFactory = new SceneFactory(this.#platforms, this.#entities, platformFactory, enemyFactory, this.#hero, powerupFactory);
        sceneFactory.createScene();

        this.#camera = new Camera({
            target: this.#hero,
            world: this.#worldContainer,
            screenSize: this.#pixiApp.screen,
            maxWorldWidth: this.#worldContainer.width,
            isBackScrollX: false,
            zoom: this.#getZoom(),
            topLimit: 64,       // sky line (the old fixed -64 offset)
            bottomLimit: 832,   // bottom of the river
        });
        globalThis.GAME_ZOOM = this.#getZoom();
        this.#weapon = new Weapon(this.#bulletFactory);
        this.#weapon.setWeapon(1);

        this.#spawnSeaDrone();

        this.#statusText?.destroy({ children: true });
        this.#statusText = undefined;

        this.#activeCharacterIndex = 0;

        this.#lives = 3;
        this.#livesText?.destroy({ children: true });
        this.#livesText = new Container();
        this.#livesText.x = 16;
        this.#livesText.y = 12;
        this.#pixiApp.stage.addChild(this.#livesText);
        this.#updateLivesText();
    }

    // Remaining lives shown with the authentic Contra medal icon (blue for
    // player 1, red for player 2) instead of a scaled-down hero sprite.
    #updateLivesText() {
        if (!this.#livesText) {
            return;
        }
        this.#livesText.removeChildren().forEach((child) => child.destroy());

        const medalTexture = this.#assets.getTexture(this.#activeCharacterIndex == 1 ? "player_2_lives_medal" : "player_1_lives_medal");
        for (let i = 0; i < this.#lives; i++) {
            const icon = new Sprite(medalTexture);
            icon.scale.set(1.25); // HD medal 16x32 -> 20x40, same size as before
            icon.x = i * (icon.width + 8);
            this.#livesText.addChild(icon);
        }
    }

    #returnToMainMenu() {
        this.#stopEndingScene();
        this.#stopSeaDrone();
        if (this.#creditsTick) {
            this.#pixiApp.ticker.remove(this.#creditsTick);
            this.#creditsTick = undefined;
        }
        this.#worldContainer?.destroy({ children: true });
        this.#worldContainer = undefined;
        this.#livesText?.destroy({ children: true });
        this.#livesText = undefined;
        this.#statusText?.destroy({ children: true });
        this.#statusText = undefined;
        this.#hero = undefined;
        this.#camera = undefined;
        this.#weapon = undefined;
        this.#platforms = [];
        this.#entities = [];
        this.#selectedMenuOption = 0;
        this.#showMainMenu();
    }

    #showMainMenu() {
        this.#menuMode = "main";
        this.#selectedMenuOption = 0;
        this.#menuContainer?.destroy({ children: true });
        this.#menuContainer = this.#createTitleMenu();
        this.#createGodModeCheckbox();
    }

    #showBriefing() {
        this.#menuMode = "briefing";
        this.#selectedMenuOption = 0;
        this.#menuContainer?.destroy({ children: true });
        this.#menuContainer = this.#createBriefingMenu();
    }

    #getSelectedProfile() {
        return this.#getHeroProfiles()[this.#characters[0]];
    }

    #getHeroProfiles() {
        return {
            "Дев'ятий": {
                text: "«Штаб, я Дев'ятий. Висадку завершив. Іду на бункер Диктатора.»",
                accent: 0xff4b3a,
                tint: 0xffffff,
            },
        };
    }

    #createGodModeCheckbox() {
        const existing = document.getElementById("game-godmode-checkbox");
        if (existing) {
            existing.remove();
        }
        // Phones and tablets: no switch - there it is a secret code instead
        // (4x FIRE then 4x JUMP, see index.js -> enableInvincibleCheat()).
        if (this.#isTouch) {
            return;
        }

        const wrapper = document.createElement("label");
        wrapper.id = "game-godmode-checkbox";
        wrapper.style.position = "fixed";
        wrapper.style.right = "18px";
        wrapper.style.top = "18px";
        wrapper.style.zIndex = "25";
        wrapper.style.display = "flex";
        wrapper.style.alignItems = "center";
        wrapper.style.gap = "8px";
        wrapper.style.padding = "10px 14px";
        wrapper.style.borderRadius = "12px";
        wrapper.style.background = "rgba(7, 19, 31, 0.8)";
        wrapper.style.border = "1px solid rgba(255, 209, 102, 0.7)";
        wrapper.style.color = "#f5f7fa";
        wrapper.style.font = "600 14px/1 Arial, sans-serif";
        wrapper.style.cursor = "pointer";

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = this.#isGodModeEnabled;
        checkbox.addEventListener("change", (event) => {
            this.#isGodModeEnabled = event.target.checked;
        });

        const text = document.createTextNode("Безсмертя");
        wrapper.appendChild(checkbox);
        wrapper.appendChild(text);

        document.body.appendChild(wrapper);
    }

    #showHeroIntro() {
        const profile = this.#getSelectedProfile();
        const container = this.#pixiApp.view.parentElement ?? document.body;
        const intro = document.createElement("div");
        intro.className = "hero-intro";
        intro.innerHTML = `
            <div class="hero-intro__card">
                <div class="hero-intro__portrait"><img src="assets/sprites/stay0000.png" alt="" style="height:64px;image-rendering:pixelated;filter:${profile.tint == 0xffffff ? "none" : "hue-rotate(200deg) saturate(0.9)"}"></div>
                <div class="hero-intro__body">
                    <div class="hero-intro__name">${this.#characters[0]}</div>
                    <div class="hero-intro__text">${profile.text}</div>
                </div>
            </div>
        `;

        this.#heroIntroOverlay?.remove();
        this.#heroIntroOverlay = intro;
        container.appendChild(intro);

        window.setTimeout(() => {
            intro.remove();
            if (this.#heroIntroOverlay === intro) {
                this.#heroIntroOverlay = undefined;
            }
        }, 4500);
    }

    #showPauseMenu() {
        this.#menuMode = "pause";
        this.#selectedMenuOption = 0;
        this.#menuContainer = this.#createMenu("ПАУЗА", ["Продовжити", "Головне меню"],
            this.#isTouch ? "Торкніться пункту, щоб вибрати" : "Стрілки - вибір, Enter - підтвердити");
    }

    #showOrientationMenu() {
        this.#menuMode = "orientation";
        this.#selectedMenuOption = 0;
        this.#menuContainer?.destroy({ children: true });
        this.#menuContainer = this.#createMenu("ПОВЕРНІТЬ ГРУ", ["ГОРИЗОНТАЛЬНО"], "Поверніть телефон або планшет боком, щоб продовжити");
    }

    #createMenu(title, options, hint) {
        const container = new Container();
        const background = new Graphics();
        background.beginFill(0x07131f, 0.92).drawRect(0, 0, this.#pixiApp.screen.width, this.#pixiApp.screen.height).endFill();
        container.addChild(background);

        // on a phone the whole view is scaled down ~2x, so everything is drawn bigger
        const touch = this.#isTouch;
        const titleStyle = new TextStyle({ fontFamily: "Anton", fontSize: touch ? 80 : 56, fill: 0xffd166, stroke: 0x000000, strokeThickness: 6 });
        const hintStyle = new TextStyle({ fontFamily: "Arial", fontSize: touch ? 28 : 18, fill: 0xa9c6d9 });

        const titleText = new Text(title, titleStyle);
        titleText.anchor.set(0.5);
        titleText.x = this.#pixiApp.screen.width / 2;
        titleText.y = 190;
        container.addChild(titleText);

        options.forEach((option, index) => {
            const text = new Text(option, new TextStyle({ fontFamily: "Anton", fontSize: touch ? 56 : 34, fill: 0xffffff, stroke: 0x000000, strokeThickness: 4 }));
            text.anchor.set(0.5);
            text.x = this.#pixiApp.screen.width / 2;
            text.y = (touch ? 340 : 330) + index * (touch ? 105 : 65);
            text.name = `menu-option-${index}`;
            container.addChild(text);
            this.#addMenuHitArea(container, index, text.x - 300, text.y - 48, 600, 96);
        });

        const hintText = new Text(hint, hintStyle);
        hintText.anchor.set(0.5);
        hintText.x = this.#pixiApp.screen.width / 2;
        hintText.y = touch ? 620 : 560;
        container.addChild(hintText);
        container.optionCount = options.length;
        this.#updateMenuSelection(container, options.length);
        this.#pixiApp.stage.addChild(container);
        return container;
    }

    // Title screen: callsign "Дев'ятий", the operation name, the hero on the
    // left and the two menu options on the right.
    #createTitleMenu() {
        const w = this.#pixiApp.screen.width;
        const h = this.#pixiApp.screen.height;
        const container = new Container();

        const background = new Graphics();
        // Just a light overall tint - the night sky, stars and mountain
        // ridge from StaticBackground show through instead of hiding behind
        // a flat panel.
        background.beginFill(0x03070c, 0.25).drawRect(0, 0, w, h).endFill();

        // Cinematic vignette on the left/right edges (stacked, thinning
        // bands - there's no gradient fill in this Pixi build, so this
        // fakes one the same way the title glow below does).
        [[260, 0.05], [180, 0.08], [100, 0.12], [40, 0.18]].forEach(([bandWidth, alpha]) => {
            background.beginFill(0x000000, alpha).drawRect(0, 0, bandWidth, h).endFill();
            background.beginFill(0x000000, alpha).drawRect(w - bandWidth, 0, bandWidth, h).endFill();
        });

        // Bottom scrim so the portrait, menu options and hint stay legible
        // over the ridge/treeline.
        [[h - 280, 0.05], [h - 200, 0.08], [h - 120, 0.12], [h - 60, 0.18]].forEach(([y, alpha]) => {
            background.beginFill(0x000000, alpha).drawRect(0, y, w, h - y).endFill();
        });

        // soft red glow behind the title (a few stacked ellipses)
        for (let k = 0; k < 6; k++) {
            background.beginFill(0x8a1a12, 0.07).drawEllipse(w / 2, 180, 470 - k * 55, 135 - k * 18).endFill();
        }
        container.addChild(background);

        const operation = new Text("ОПЕРАЦІЯ", new TextStyle({ fontFamily: "Arial", fontWeight: "bold", fontSize: 20, fill: 0xa9c6d9, letterSpacing: 12 }));
        operation.anchor.set(0.5);
        operation.x = w / 2;
        operation.y = 88;
        container.addChild(operation);

        const title = new Text("ДЕВ'ЯТИЙ", new TextStyle({
            fontFamily: "Anton",
            fontSize: 118,
            fill: [0xfff1b8, 0xffb000],
            stroke: 0x3a0a05,
            strokeThickness: 10,
            letterSpacing: 6,
            dropShadow: true,
            dropShadowColor: 0x000000,
            dropShadowDistance: 6,
            dropShadowAngle: Math.PI / 2,
        }));
        title.anchor.set(0.5);
        title.x = w / 2;
        title.y = 180;
        container.addChild(title);

        const subtitle = new Text("ДЕСАНТ У БУНКЕР ДИКТАТОРА", new TextStyle({ fontFamily: "Anton", fontSize: 32, fill: 0xff4b3a, stroke: 0x000000, strokeThickness: 5, letterSpacing: 5 }));
        subtitle.anchor.set(0.5);
        subtitle.x = w / 2;
        subtitle.y = 272;
        container.addChild(subtitle);

        // Thin stencil-style divider with a diamond tick, under the subtitle.
        const divider = new Graphics();
        divider.lineStyle(2, 0xff4b3a, 0.6);
        divider.moveTo(w / 2 - 230, 306).lineTo(w / 2 - 14, 306);
        divider.moveTo(w / 2 + 14, 306).lineTo(w / 2 + 230, 306);
        divider.lineStyle(0);
        divider.beginFill(0xffd166).drawPolygon([w / 2, 300, w / 2 + 7, 306, w / 2, 312, w / 2 - 7, 306]).endFill();
        container.addChild(divider);

        const portrait = this.#buildPortrait(this.#getSelectedProfile(), 280);
        portrait.x = w / 2 - 340;
        portrait.y = 322;
        container.addChild(portrait);

        const callsign = new Text("позивний «Дев'ятий»", new TextStyle({ fontFamily: "Arial", fontSize: 18, fill: 0xa9c6d9, fontStyle: "italic" }));
        callsign.anchor.set(0.5, 0);
        callsign.x = portrait.x + 140;
        callsign.y = portrait.y + 280 + 14;
        container.addChild(callsign);

        // Small intel readout, top-right - pure flavour text.
        const coords = new Text("48.3800 N\n31.1656 E", new TextStyle({
            fontFamily: "Arial", fontSize: 14, fill: 0xff6a52, letterSpacing: 1, align: "right",
        }));
        coords.anchor.set(1, 0);
        coords.x = w - 36;
        coords.y = 28;
        container.addChild(coords);

        // Menu options as icon rows - dark by default, red when selected
        // (both states pre-built and toggled in #updateMenuSelection so
        // there's no per-frame redraw).
        const rowW = 460, rowH = 76, rowGap = 16, rowX = w / 2 - 20, rowStartY = 372;
        const options = [
            { label: "ПОЧАТИ МІСІЮ", icon: "play" },
            { label: "БРИФІНГ", icon: "doc" },
        ];
        options.forEach((option, index) => {
            const rowY = rowStartY + index * (rowH + rowGap);

            const bgOff = new Graphics();
            bgOff.lineStyle(1.5, 0x3a4b5c, 0.7);
            bgOff.beginFill(0x0a141d, 0.65);
            bgOff.drawRoundedRect(0, 0, rowW, rowH, 12);
            bgOff.endFill();
            bgOff.x = rowX;
            bgOff.y = rowY;
            bgOff.name = `menu-row-off-${index}`;
            container.addChild(bgOff);

            const bgOn = new Graphics();
            for (let k = 0; k < 4; k++) {
                bgOn.beginFill(0xb3261a, 0.2).drawRoundedRect(0, 0, rowW, rowH, 12).endFill();
            }
            bgOn.lineStyle(2, 0xff5a3c, 0.95);
            bgOn.drawRoundedRect(1, 1, rowW - 2, rowH - 2, 12);
            bgOn.x = rowX;
            bgOn.y = rowY;
            bgOn.name = `menu-row-on-${index}`;
            container.addChild(bgOn);

            const badge = new Graphics();
            badge.beginFill(0x050b12, 0.85);
            badge.drawCircle(38, rowH / 2, 21);
            badge.endFill();
            badge.x = rowX;
            badge.y = rowY;
            const icon = this.#drawMenuIcon(option.icon, 38, rowH / 2);
            icon.x = rowX;
            icon.y = rowY;
            container.addChild(badge, icon);

            // No `baseText` here on purpose: this menu already shows the
            // selected row via the red bgOn highlight and its own circular
            // icon badge, so #updateMenuSelection's generic "► " text
            // prefix would just draw a second, redundant play/arrow glyph
            // right next to the one already in the icon.
            const text = new Text(option.label, new TextStyle({ fontFamily: "Anton", fontSize: 38, fill: 0xffffff, stroke: 0x000000, strokeThickness: 4, letterSpacing: 2 }));
            text.anchor.set(0, 0.5);
            text.x = rowX + 76;
            text.y = rowY + rowH / 2;
            text.name = `menu-option-${index}`;
            container.addChild(text);
            this.#addMenuHitArea(container, index, rowX, rowY, rowW, rowH);
        });

        // Bottom control hints, each key drawn as its own keycap badge
        // (on a touchscreen: just "tap an item").
        if (this.#isTouch) {
            const touchHint = new Text("Торкніться пункту меню, щоб почати", new TextStyle({ fontFamily: "Arial", fontSize: 20, fill: 0xa9c6d9 }));
            touchHint.anchor.set(0.5);
            touchHint.x = w / 2;
            touchHint.y = h - 45;
            container.addChild(touchHint);
            container.optionCount = options.length;
            this.#updateMenuSelection(container, options.length);
            this.#pixiApp.stage.addChild(container);
            return container;
        }
        const keys = [
            ["↑↓", "ВИБІР"],
            ["ENTER", "ПІДТВЕРДИТИ"],
            ["SPACE", "СТРИБОК"],
            ["F", "ВОГОНЬ"],
            ["P", "ПАУЗА"],
        ];
        const hintDivider = new Graphics();
        hintDivider.lineStyle(1, 0xa9c6d9, 0.25);
        hintDivider.moveTo(w / 2 - 360, h - 68).lineTo(w / 2 + 360, h - 68);
        container.addChild(hintDivider);

        const keyStyle = new TextStyle({ fontFamily: "Arial", fontWeight: "bold", fontSize: 13, fill: 0xdfeffb });
        const labelStyle = new TextStyle({ fontFamily: "Arial", fontSize: 14, fill: 0xa9c6d9 });
        const measured = keys.map(([key, label]) => {
            const keyText = new Text(key, keyStyle);
            const labelText = new Text(label, labelStyle);
            const capWidth = keyText.width + 20;
            return { keyText, labelText, capWidth, groupWidth: capWidth + 8 + labelText.width };
        });
        const totalWidth = measured.reduce((sum, m) => sum + m.groupWidth, 0) + (measured.length - 1) * 26;
        let cursorX = w / 2 - totalWidth / 2;
        const hintY = h - 45;
        measured.forEach(({ keyText, labelText, capWidth }) => {
            const cap = new Graphics();
            cap.lineStyle(1.5, 0xa9c6d9, 0.6);
            cap.beginFill(0x0a141d, 0.7);
            cap.drawRoundedRect(0, 0, capWidth, 28, 6);
            cap.endFill();
            cap.x = cursorX;
            cap.y = hintY - 14;
            container.addChild(cap);

            keyText.anchor.set(0.5);
            keyText.x = cursorX + capWidth / 2;
            keyText.y = hintY;
            container.addChild(keyText);

            labelText.anchor.set(0, 0.5);
            labelText.x = cursorX + capWidth + 8;
            labelText.y = hintY;
            container.addChild(labelText);

            cursorX += capWidth + 8 + labelText.width + 26;
        });

        container.optionCount = options.length;
        this.#updateMenuSelection(container, options.length);
        this.#pixiApp.stage.addChild(container);
        return container;
    }

    // Mission briefing: the story of the operation.
    #createBriefingMenu() {
        const w = this.#pixiApp.screen.width;
        const h = this.#pixiApp.screen.height;
        const container = new Container();

        const frameX = 60, frameY = 40, frameW = w - 120, frameH = h - 150;

        const background = new Graphics();
        background.beginFill(0x050b12, 0.94).drawRect(0, 0, w, h).endFill();
        // Soft red glow behind the header, echoing the main menu's title so
        // this reads as the same document/identity, not a bare debug popup.
        for (let k = 0; k < 5; k++) {
            background.beginFill(0x8a1a12, 0.05).drawEllipse(w / 2, frameY + 66, 420 - k * 50, 92 - k * 14).endFill();
        }
        background.lineStyle(1.5, 0xffd166, 0.35).drawRoundedRect(frameX, frameY, frameW, frameH, 16);
        container.addChild(background);

        // Targeting-style corner brackets on the frame - same motif as the
        // hero portrait elsewhere, so the dossier matches the game's look.
        const brackets = new Graphics();
        brackets.lineStyle(3, 0xffd166, 0.9);
        const armLength = 26;
        [
            [frameX, frameY, 1, 1],
            [frameX + frameW, frameY, -1, 1],
            [frameX, frameY + frameH, 1, -1],
            [frameX + frameW, frameY + frameH, -1, -1],
        ].forEach(([cx, cy, dx, dy]) => {
            brackets.moveTo(cx, cy + armLength * dy).lineTo(cx, cy).lineTo(cx + armLength * dx, cy);
        });
        container.addChild(brackets);

        // The game's own name travels with this screen too, not just the
        // main menu - a small kicker above the "БРИФІНГ" heading.
        const kicker = new Text("ОПЕРАЦІЯ «ДЕВ'ЯТИЙ»", new TextStyle({ fontFamily: "Arial", fontWeight: "bold", fontSize: 15, fill: 0xa9c6d9, letterSpacing: 6 }));
        kicker.anchor.set(0.5, 0);
        kicker.x = w / 2;
        kicker.y = frameY + 18;
        container.addChild(kicker);

        const header = new Text("БРИФІНГ", new TextStyle({
            fontFamily: "Anton",
            fontSize: 54,
            fill: [0xfff1b8, 0xffb000],
            stroke: 0x3a0a05,
            strokeThickness: 6,
            letterSpacing: 4,
        }));
        header.anchor.set(0.5, 0);
        header.x = w / 2;
        header.y = kicker.y + 24;
        container.addChild(header);

        const stamp = new Text("ЦІЛКОМ ТАЄМНО  ·  ДЛЯ ПОЗИВНОГО «ДЕВ'ЯТИЙ»", new TextStyle({ fontFamily: "Arial", fontWeight: "bold", fontSize: 15, fill: 0xff4b3a, letterSpacing: 3 }));
        stamp.anchor.set(0.5, 0);
        stamp.x = w / 2;
        stamp.y = header.y + header.height + 4;
        container.addChild(stamp);

        // Diamond-tick divider, matching the main menu's, closing off the header block.
        const dividerY = stamp.y + stamp.height + 18;
        const divider = new Graphics();
        divider.lineStyle(2, 0xff4b3a, 0.6);
        divider.moveTo(w / 2 - 230, dividerY).lineTo(w / 2 - 14, dividerY);
        divider.moveTo(w / 2 + 14, dividerY).lineTo(w / 2 + 230, dividerY);
        divider.lineStyle(0);
        divider.beginFill(0xffd166).drawPolygon([w / 2, dividerY - 6, w / 2 + 7, dividerY, w / 2, dividerY + 6, w / 2 - 7, dividerY]).endFill();
        container.addChild(divider);

        const lore = [
            "Диктатор сховався в бункері на далекому острові посеред джунглів. Звідти він віддає накази своїй армії і певен, що до нього ніхто не дістанеться.",
            "Розвідка знайшла шлях: річка, міст, скелі й густі джунглі, а за ними — сталева стіна бункера з двома гарматами і броньованими воротами.",
            "Велика група не пройде непомітно. Тому цієї ночі висаджується один боєць — позивний «Дев'ятий».",
            "Завдання: пройти крізь охорону, підбирати зброю зі збитих капсул постачання, розбити гармати на стіні й вибити ворота бункера.",
            "Зв'язок — лише після висадки і після штурму. Удачі, Дев'ятий.",
        ].join("\n\n");
        const body = new Text(lore, new TextStyle({
            fontFamily: "Arial",
            fontSize: this.#isTouch ? 27 : 20,
            lineHeight: this.#isTouch ? 37 : 29,
            fill: 0xdfeffb,
            wordWrap: true,
            wordWrapWidth: frameW - 100,
        }));
        body.x = frameX + 50;

        // The lore text can be taller than the space left inside the frame
        // (short/phone screens, or the bigger touch font) - so it sits in
        // its own scrollable viewport, masked to the frame's own inner
        // bounds so a scrolled line can never spill past the border.
        const viewportTop = dividerY + 20;
        const viewportBottom = frameY + frameH - 22;
        const viewportHeight = viewportBottom - viewportTop;

        const bodyLayer = new Container();
        bodyLayer.y = viewportTop;
        bodyLayer.addChild(body);
        container.addChild(bodyLayer);

        const mask = new Graphics();
        mask.beginFill(0xffffff).drawRect(frameX, viewportTop, frameW, viewportHeight).endFill();
        mask.renderable = false; // only used for its shape, not drawn
        container.addChild(mask);
        bodyLayer.mask = mask;

        const maxScroll = Math.max(0, body.height - viewportHeight);
        if (maxScroll > 0) {
            // Soft fade at the top/bottom of the viewport instead of a hard
            // clip, so a cut-off line reads as "scroll for more" rather
            // than a rendering glitch.
            const fadeSteps = [[0, 0.85], [4, 0.55], [8, 0.3], [12, 0.12]];
            const topFade = new Graphics();
            fadeSteps.forEach(([dy, alpha]) => {
                topFade.beginFill(0x050b12, alpha).drawRect(frameX, viewportTop + dy, frameW, 4).endFill();
            });
            container.addChild(topFade);
            const bottomFade = new Graphics();
            fadeSteps.forEach(([dy, alpha]) => {
                bottomFade.beginFill(0x050b12, alpha).drawRect(frameX, viewportBottom - dy - 4, frameW, 4).endFill();
            });
            container.addChild(bottomFade);

            const track = new Graphics();
            track.beginFill(0xffffff, 0.12).drawRoundedRect(frameX + frameW - 20, viewportTop, 6, viewportHeight, 3).endFill();
            container.addChild(track);

            const thumbHeight = Math.max(30, viewportHeight * viewportHeight / body.height);
            const thumb = new Graphics();
            thumb.beginFill(0xffd166, 0.85).drawRoundedRect(frameX + frameW - 20, viewportTop, 6, thumbHeight, 3).endFill();
            container.addChild(thumb);

            const applyScroll = (offset) => {
                const clamped = Math.min(0, Math.max(-maxScroll, offset));
                bodyLayer.y = viewportTop + clamped;
                thumb.y = (-clamped / maxScroll) * (viewportHeight - thumbHeight);
            };

            const hit = new Graphics();
            hit.beginFill(0xffffff, 0.001).drawRect(frameX, viewportTop, frameW, viewportHeight).endFill();
            hit.eventMode = "static";
            hit.cursor = "grab";
            container.addChild(hit);

            let dragging = false;
            let dragStartY = 0;
            let dragStartOffset = 0;
            hit.on("pointerdown", (event) => {
                dragging = true;
                hit.cursor = "grabbing";
                dragStartY = event.global.y;
                dragStartOffset = bodyLayer.y - viewportTop;
            });
            const stopDrag = () => { dragging = false; hit.cursor = "grab"; };
            hit.on("pointerup", stopDrag);
            hit.on("pointerupoutside", stopDrag);
            hit.on("pointermove", (event) => {
                if (!dragging) {
                    return;
                }
                applyScroll(dragStartOffset + (event.global.y - dragStartY));
            });
            hit.on("wheel", (event) => {
                applyScroll(bodyLayer.y - viewportTop - event.deltaY);
            });
        }

        const options = ["ПОЧАТИ МІСІЮ", "НАЗАД"];
        options.forEach((option, index) => {
            const text = new Text(option, new TextStyle({ fontFamily: "Anton", fontSize: this.#isTouch ? 48 : 36, fill: 0xffffff, stroke: 0x000000, strokeThickness: 4, letterSpacing: 2 }));
            text.baseText = option;
            text.anchor.set(0, 0.5);
            text.x = index == 0 ? w / 2 - (this.#isTouch ? 380 : 280) : w / 2 + 100;
            text.y = h - 70;
            text.name = `menu-option-${index}`;
            container.addChild(text);
            this.#addMenuHitArea(container, index, text.x - 30, text.y - 40, this.#isTouch ? 400 : 300, 80);
        });

        container.optionCount = options.length;
        this.#updateMenuSelection(container, options.length);
        this.#pixiApp.stage.addChild(container);
        return container;
    }

    // Portrait = the character headshot, cropped to a rounded square and
    // framed like a dog-tag ID photo: soft accent glow, gold border, and a
    // set of targeting-style corner brackets just outside the frame.
    #buildPortrait(profile, size) {
        const container = new Container();

        for (let k = 0; k < 5; k++) {
            const glow = new Graphics();
            glow.beginFill(profile.accent, 0.05);
            glow.drawCircle(size / 2, size / 2, size * 0.72 - k * (size * 0.08));
            glow.endFill();
            container.addChild(glow);
        }

        const bg = new Graphics();
        bg.beginFill(0x0d1620);
        bg.drawRoundedRect(0, 0, size, size, 14);
        bg.endFill();
        container.addChild(bg);

        const photo = new Sprite(this.#assets.getTexture("ava"));
        photo.width = size;
        photo.height = size;
        const photoMask = new Graphics();
        photoMask.beginFill(0xffffff);
        photoMask.drawRoundedRect(0, 0, size, size, 14);
        photoMask.endFill();
        photo.mask = photoMask;
        container.addChild(photo, photoMask);

        const frame = new Graphics();
        frame.lineStyle(3, 0xffd166, 0.9);
        frame.drawRoundedRect(1.5, 1.5, size - 3, size - 3, 14);
        container.addChild(frame);

        const brackets = new Graphics();
        brackets.lineStyle(3, profile.accent, 0.95);
        const armLength = 20, offset = 10;
        // top-left
        brackets.moveTo(-offset, -offset + armLength).lineTo(-offset, -offset).lineTo(-offset + armLength, -offset);
        // top-right
        brackets.moveTo(size + offset - armLength, -offset).lineTo(size + offset, -offset).lineTo(size + offset, -offset + armLength);
        // bottom-left
        brackets.moveTo(-offset, size + offset - armLength).lineTo(-offset, size + offset).lineTo(-offset + armLength, size + offset);
        // bottom-right
        brackets.moveTo(size + offset - armLength, size + offset).lineTo(size + offset, size + offset).lineTo(size + offset, size + offset - armLength);
        container.addChild(brackets);

        return container;
    }

    // Simple vector icon for a menu row.
    #drawMenuIcon(type, cx, cy) {
        const icon = new Graphics();
        icon.beginFill(0xffffff);
        if (type == "play") {
            icon.drawPolygon([cx - 6, cy - 9, cx - 6, cy + 9, cx + 10, cy]);
            icon.endFill();
        }
        else {
            icon.drawRoundedRect(cx - 8, cy - 11, 16, 22, 2);
            icon.endFill();
            icon.beginFill(0x050b12);
            icon.drawRect(cx - 5, cy - 5, 10, 2);
            icon.drawRect(cx - 5, cy, 10, 2);
            icon.drawRect(cx - 5, cy + 5, 6, 2);
            icon.endFill();
        }
        return icon;
    }

    #updateMenuSelection(container, optionCount) {
        for (let index = 0; index < optionCount; index++) {
            const option = container.getChildByName(`menu-option-${index}`);
            const isSelected = index == this.#selectedMenuOption;
            if (option.baseText) {
                option.text = isSelected ? `► ${option.baseText}` : option.baseText;
            }

            const rowOff = container.getChildByName(`menu-row-off-${index}`);
            const rowOn = container.getChildByName(`menu-row-on-${index}`);
            if (rowOff && rowOn) {
                rowOff.visible = !isSelected;
                rowOn.visible = isSelected;
                option.style.fill = isSelected ? 0xffffff : 0xc9d4dd;
            }
            else {
                option.style.fill = isSelected ? 0xffd166 : 0xffffff;
            }
        }
    }

    #handleMenuKey(keyName) {
        if (this.#menuMode == "orientation") {
            return;
        }

        // Ending: Enter skips the scene straight to the credits, and the
        // credits back to the main menu. Nothing else reacts.
        if (this.#menuMode == "cutscene" || this.#menuMode == "credits") {
            if (keyName == "Enter") {
                if (this.#menuMode == "cutscene") {
                    this.#showCredits();
                }
                else {
                    this.#finishCredits();
                }
            }
            return;
        }

        const isNextKey = keyName == "ArrowDown" || keyName == "ArrowRight";
        const isPrevKey = keyName == "ArrowUp" || keyName == "ArrowLeft";
        if (isNextKey || isPrevKey) {
            const optionCount = this.#menuContainer?.optionCount ?? 2;
            const direction = isNextKey ? 1 : -1;
            this.#selectedMenuOption = (this.#selectedMenuOption + direction + optionCount) % optionCount;
            this.#updateMenuSelection(this.#menuContainer, optionCount);
            return;
        }

        if (keyName != "Enter") {
            return;
        }

        if (this.#menuMode == "main") {
            if (this.#selectedMenuOption == 0) {
                this.#startGame();
            }
            else {
                this.#showBriefing();
            }
        }
        else if (this.#menuMode == "briefing") {
            if (this.#selectedMenuOption == 0) {
                this.#startGame();
            }
            else {
                this.#showMainMenu();
            }
        }
        else if (this.#selectedMenuOption == 0) {
            this.#menuContainer?.destroy({ children: true });
            this.#menuContainer = undefined;
            this.#menuMode = "playing";
        }
        else {
            this.#returnToMainMenu();
        }
    }

    #checkGameStatus(){

        if(this.#isEndGame){
            return;
        }

        const isBossDead = this.#entities.some(e => e.isBoss && !e.isActive);
        if(isBossDead){
            const enemies = this.#entities.filter(e => e.type == "enemy" && !e.isBoss);
            enemies.forEach(e => e.dead());

            this.keyboardProcessor.releaseAll();
            this.#weapon.stopFire();

            this.#isEndGame = true;
            this.#startEnding();
        }

        const isHeroDead = !this.#entities.some(e => e.type == "hero") && this.#hero.isDead;
        if(isHeroDead){
            this.#lives--;
            this.#updateLivesText();

            this.keyboardProcessor.releaseAll();
            this.#weapon.stopFire();

            if(this.#lives <= 0){
                this.#isEndGame = true;
                this.#showGameOver();
                return;
            }

            this.#entities.push(this.#hero);
            this.#worldContainer.game.addChild(this.#hero._view);
            this.#hero.reset();
            this.#hero.x = this.#viewLeft() + 160;
            this.#hero.y = 100;
            this.#weapon.setWeapon(1);
        }
    }

    // The authentic pixel-font GAME OVER graphic from the ROM, tinted per
    // player color, instead of a rendered web font. Shown briefly on its
    // own, then hands off to a proper full-screen aftermath card (same
    // visual language as the win credits screen) instead of a caption
    // crammed under the pixel sprite.
    #showGameOver(){
        const texture = this.#assets.getTexture(this.#activeCharacterIndex == 1 ? "player_2_game_over" : "player_1_game_over");
        const sprite = new Sprite(texture);
        sprite.scale.set(6);
        sprite.x = this.#pixiApp.screen.width/2 - sprite.width/2;
        sprite.y = this.#pixiApp.screen.height/2 - sprite.height/2;

        const gameOver = new Container();
        gameOver.addChild(sprite);

        this.#statusText?.destroy({ children: true });
        this.#statusText = gameOver;
        this.#pixiApp.stage.addChild(gameOver);

        window.setTimeout(() => {
            this.#showGameOverAftermath();
        }, 1800);
    }

    // Full-screen "mission failed" card shown after the pixel GAME OVER
    // beat - same black-background/Impact-title/Arial-body language as
    // #showCredits, so a loss reads as a proper story moment, not a
    // one-line caption tacked onto the arcade graphic.
    #showGameOverAftermath(){
        const w = this.#pixiApp.screen.width;
        const h = this.#pixiApp.screen.height;

        const container = new Container();
        const background = new Graphics();
        background.beginFill(0x000000).drawRect(0, 0, w, h).endFill();
        container.addChild(background);

        const title = new Text("МІСІЮ ЗІРВАНО", new TextStyle({
            fontFamily: "Anton",
            fontSize: 54,
            fill: [0xffffff, 0xdd0000],
            stroke: 0x000000,
            strokeThickness: 6,
            letterSpacing: 6,
        }));
        title.anchor.set(0.5, 0);
        title.x = w / 2;
        title.y = h / 2 - 90;
        container.addChild(title);

        const line = new Text("На жаль, місію довелося згорнути, а Дев'ятий відступив у безпечне місце.", new TextStyle({
            fontFamily: "Arial",
            fontSize: 22,
            fill: 0xa9c6d9,
            wordWrap: true,
            wordWrapWidth: w - 160,
            align: "center",
        }));
        line.anchor.set(0.5, 0);
        line.x = w / 2;
        line.y = title.y + title.height + 24;
        container.addChild(line);

        this.#statusText?.destroy({ children: true });
        this.#statusText = container;
        this.#pixiApp.stage.addChild(container);

        window.setTimeout(() => {
            this.#returnToMainMenu();
        }, 3200);
    }

    // Mission opening: an unmanned armed sea drone (cut out of the reference
    // render: grey hull, turret, launchers, tube floats) runs along the river
    // past the landing zone and is gone once it leaves the screen on the right.
    // The water contact is simulated rather than baked into the art: a bow
    // wave with flying spray, foam slipping along the hull, churned water and
    // a rooster tail at the stern, a widening wake left on the water and a
    // dim reflection under the hull.
    #spawnSeaDrone() {
        this.#stopSeaDrone();

        const layer = this.#worldContainer.foreground;
        const waterline = 790;                        // in the river band, in front of the islands
        const speed = 3.6;
        // art: 300x81, bottom row = waterline; hull meets the water between
        // x 6 (stern) and x 246 (bow stem), the stem rises to x 268 at row 68
        const STERN = 6, BOW = 246;
        const texture = this.#assets.getTexture("seadrone0000");

        const back = new Graphics();                  // wake + reflection-side foam, behind the hull
        const reflection = new Sprite(texture);
        reflection.anchor.set(0, 1);
        reflection.scale.y = -0.32;
        reflection.alpha = 0.16;
        reflection.tint = 0x0b2a44;
        const drone = new Sprite(texture);
        drone.anchor.set(0, 1);
        const front = new Graphics();                 // waterline foam, bow wave, spray
        layer.addChild(back, reflection, drone, front);

        drone.x = this.#viewLeft() - drone.width - 40;
        drone.y = waterline;

        const rand = (min, max) => min + Math.random() * (max - min);
        const foam = [];      // flat foam patches lying on the water (world-fixed)
        const rings = [];     // expanding wake ripples
        const drops = [];     // spray droplets under gravity
        let time = 0;
        let running = true;
        let ringTimer = 0;

        const addFoam = (x, y, r, life, vx = 0, vy = 0, a = rand(0.4, 0.8)) => foam.push({ x, y, r, grow: rand(0.06, 0.22), life, max: life, vx, vy, a });
        // stable per-world-x noise, so the foam pattern on the seam drifts aft instead of flickering
        const hash = (n) => { const v = Math.sin(n * 127.1) * 43758.5453; return v - Math.floor(v); };
        const addDrop = (x, y, vx, vy, r, life) => drops.push({ x, y, vx, vy, r, life, max: life });

        const cleanup = () => {
            for (const obj of [back, reflection, drone, front]) {
                if (!obj.destroyed) { obj.destroy(); }
            }
        };

        this.#seaDroneTick = (delta) => {
            if (this.#menuMode != "playing") {
                return;                               // everything freezes while paused
            }
            time += delta;
            const d = Math.min(delta, 2);

            if (running) {
                // heave + a slow pitch: the bow lifts on the swell
                const pitch = Math.sin(time * 0.07) * 0.007 + Math.sin(time * 0.19) * 0.003;
                drone.x += speed * d;
                drone.y = waterline + Math.sin(time * 0.11) * 1.2;
                drone.rotation = -pitch;
                reflection.x = drone.x;
                reflection.y = waterline + 1;
                reflection.scale.x = 1 + Math.sin(time * 0.3) * 0.01;
                reflection.alpha = 0.13 + Math.sin(time * 0.23) * 0.03;

                const bowX = drone.x + BOW;
                const sternX = drone.x + STERN;
                const bowLift = Math.max(0, pitch) * 600;     // 0..~6px: bigger bow wave on the plunge

                // bow: water thrown up and back in a fan, plus fine mist
                for (let i = 0; i < 5; i++) {
                    addDrop(bowX + rand(-8, 6), waterline - rand(0, 4),
                        speed + rand(-2.4, 1.2), -rand(1.6, 4.2) - bowLift * 0.15, rand(0.8, 2.1), rand(16, 30));
                }
                if (Math.random() < 0.6) {
                    addDrop(bowX + rand(-4, 8), waterline - rand(4, 10), speed + rand(-1, 1), -rand(0.3, 1), rand(2.5, 4.5), rand(10, 18));
                }
                // foam peeling off along the hull (stays in the world, so it slides aft)
                for (let i = 0; i < 4; i++) {
                    const t = Math.random();
                    const along = STERN + (BOW - STERN) * (1 - t * t);   // denser towards the bow
                    addFoam(drone.x + along, waterline + rand(-1, 2), rand(1.2, 2.6), rand(14, 26));
                }
                // stern: churned white water and a low rooster tail
                for (let i = 0; i < 3; i++) {
                    // the wake spreads out and breaks up the further it is behind the boat
                    addFoam(sternX - rand(0, 16), waterline + rand(-1, 3), rand(1.5, 4), rand(50, 120),
                        rand(0.3, 1.4), rand(-0.03, 0.06), rand(0.25, 0.6));
                }
                for (let i = 0; i < 3; i++) {
                    addDrop(sternX - rand(0, 6), waterline - rand(0, 3), rand(0.4, 2.2), -rand(1.2, 3.2), rand(0.8, 1.8), rand(18, 30));
                }
                // the diverging wake: a ripple every few frames at the stern
                ringTimer -= d;
                if (ringTimer <= 0) {
                    ringTimer = 5;
                    rings.push({ x: sternX - 4, y: waterline + rand(1, 4), r: 10, life: 90, max: 90 });
                }

                const screenRight = this.#viewRight();
                if (drone.x > screenRight + 40) {
                    running = false;                  // hull gone - let the wake die out
                    drone.visible = false;
                    reflection.visible = false;
                }
            }

            // ---- simulate ----
            for (let i = foam.length - 1; i >= 0; i--) {
                const f = foam[i];
                f.life -= d;
                f.x += f.vx * d;
                f.vx *= 0.96;
                f.y += f.vy * d;
                f.r += f.grow * d;
                if (f.life <= 0) { foam.splice(i, 1); }
            }
            for (let i = rings.length - 1; i >= 0; i--) {
                const r = rings[i];
                r.life -= d;
                r.r += 0.9 * d;
                if (r.life <= 0) { rings.splice(i, 1); }
            }
            for (let i = drops.length - 1; i >= 0; i--) {
                const p = drops[i];
                p.life -= d;
                p.vy += 0.22 * d;
                p.vx *= 0.985;
                p.x += p.vx * d;
                p.y += p.vy * d;
                if (p.y >= waterline + 1 && p.vy > 0) {
                    // droplet lands: leaves a speck of foam and a tiny ring
                    addFoam(p.x, waterline + rand(0, 2), p.r * 0.8, rand(10, 18));
                    if (p.r > 1.6) { rings.push({ x: p.x, y: waterline + 1, r: 2, life: 16, max: 16 }); }
                    drops.splice(i, 1);
                }
                else if (p.life <= 0) { drops.splice(i, 1); }
            }

            // ---- draw ----
            back.clear();
            for (const r of rings) {
                const k = r.life / r.max;
                back.lineStyle(1.3, 0xd9f1ff, 0.55 * k * k);
                back.drawEllipse(r.x, r.y, r.r, r.r * 0.16);
            }
            back.lineStyle(0);
            for (const f of foam) {
                const k = f.life / f.max;
                // fresh foam is white, old foam turns into pale turquoise streaks
                back.beginFill(k > 0.5 ? 0xf4fbff : 0xbfe8f8, f.a * k);
                back.drawEllipse(f.x, f.y, f.r * 1.6, f.r * 0.45);
                back.endFill();
            }

            front.clear();
            if (running) {
                const bowX = drone.x + BOW;
                const surge = 8 + Math.sin(time * 0.5) * 1.5 + Math.max(0, Math.sin(time * 0.07)) * 4;
                // bow wave: a white mound pushed ahead of the stem
                front.beginFill(0xdff3ff, 0.85);
                front.moveTo(bowX - 34, waterline + 2);
                front.quadraticCurveTo(bowX - 10, waterline - surge * 0.9, bowX + 6, waterline - surge);
                front.quadraticCurveTo(bowX + 16, waterline - surge * 0.4, bowX + 20, waterline + 2);
                front.closePath();
                front.endFill();
                front.beginFill(0xffffff, 0.9);
                front.drawEllipse(bowX + 2, waterline - surge + 1.5, 6, 2);
                front.endFill();
                // broken, bubbling seam where the hull meets the water
                const base = Math.floor(drone.x / 4);
                for (let i = Math.ceil(STERN / 4); i < BOW / 4; i++) {
                    const n = hash(base + i);
                    const toBow = i * 4 / BOW;                    // more froth towards the bow
                    if (n < 0.35 - toBow * 0.3) { continue; }
                    const r = 1.2 + hash(base + i + 0.5) * 2.2 + toBow * 1.2;
                    front.beginFill(0xf0faff, 0.35 + n * 0.5);
                    front.drawEllipse((base + i) * 4, waterline + 0.5 + (hash(base + i + 0.25) - 0.5) * 2.2, r * 1.3, r * 0.5);
                    front.endFill();
                }
                // bow "moustache": the sheet of water peeling back along the hull from the stem
                front.beginFill(0xe4f5ff, 0.5);
                front.moveTo(bowX + 4, waterline - surge * 0.8);
                front.quadraticCurveTo(bowX - 30, waterline - surge * 0.75 - 3, bowX - 80, waterline + 1);
                front.lineTo(bowX - 10, waterline + 2);
                front.closePath();
                front.endFill();
            }
            for (const p of drops) {
                const k = Math.min(1, p.life / p.max * 1.5);
                front.beginFill(p.r > 2.4 ? 0xe8f6ff : 0xffffff, (p.r > 2.4 ? 0.35 : 0.9) * k);
                front.drawCircle(p.x, p.y, p.r);
                front.endFill();
            }

            if (!running && foam.length == 0 && rings.length == 0 && drops.length == 0) {
                this.#stopSeaDrone();
            }
        };
        this.#seaDroneCleanup = cleanup;
        this.#pixiApp.ticker.add(this.#seaDroneTick);
    }

    #stopSeaDrone() {
        if (this.#seaDroneTick) {
            this.#pixiApp.ticker.remove(this.#seaDroneTick);
            this.#seaDroneTick = undefined;
        }
        if (this.#seaDroneCleanup) {
            this.#seaDroneCleanup();
            this.#seaDroneCleanup = undefined;
        }
    }

    // ---- Ending --------------------------------------------------------------
    // The bunker gate is blown open: the Dictator walks out of the hole and
    // drops to his knee with his hands up, the hero walks right up to him -
    // one shot point-blank, his head flies off and the body falls - then fade
    // out and the credits roll.
    #startEnding() {
        this.#menuMode = "cutscene";
        this.keyboardProcessor.releaseAll();
        this.#weapon?.stopFire();
        this.#heroIntroOverlay?.remove();

        // No bullets frozen in the air and no killed enemies left standing
        // (the game loop that normally removes them is paused for the scene).
        this.#entities = this.#entities.filter((entity) => {
            if (entity.type == "heroBullet" || entity.type == "enemyBullet" || (entity.isDead && entity.type != "hero")) {
                entity.removeFromStage();
                return false;
            }
            return true;
        });

        const layer = this.#worldContainer.game;
        const groundY = 720;                     // boss approach tier
        const gateX = 128 * 52 - 42.4 + 43;      // centre of the bunker gate
        const dictatorStopX = gateX - 110;
        const heroStopX = dictatorStopX - 170; // first stops at a distance, walks up later

        // Side-view pixel sprites (48x72), facing left: 4 walk frames,
        // standing, going down on one knee, kneeling with hands up.
        const walkTextures = ["dictator0000", "dictator0001", "dictator0002", "dictator0003"].map((name) => this.#assets.getTexture(name));
        const dictator = new AnimatedSprite(walkTextures);
        dictator.animationSpeed = 1 / 7;
        dictator.anchor.set(0.5, 1);
        dictator.scale.set(1.35);
        dictator.x = gateX;
        dictator.y = groundY + 4;
        dictator.alpha = 0;
        layer.addChild(dictator);

        const hero = this.#hero;
        const heroView = hero._view;
        heroView.setBlinking(false);
        heroView.alpha = 1;
        heroView.showParachute(false);
        if (hero.x < heroStopX - 600) {
            hero.x = heroStopX - 600;            // don't make the scene wait on a long walk
        }
        hero.y = groundY - 90;
        heroView.flip(1);

        const bubbles = [];
        const say = (text, x, y) => {
            const bubble = this.#createSpeechBubble(text);
            bubble.x = x;
            bubble.y = y;
            layer.addChild(bubble);
            bubbles.push(bubble);
            return bubble;
        };

        const head = new Sprite(this.#assets.getTexture("dictatorhead0000"));
        head.anchor.set(0.5);
        head.scale.set(1.35);
        head.visible = false;
        const headMotion = { vx: 0, vy: 0, bounced: false };
        const flash = new Graphics();
        flash.beginFill(0xfff3a0).drawPolygon([0, -9, 5, -3, 16, 0, 5, 3, 0, 9, -4, 0]).endFill();
        flash.beginFill(0xffffff).drawCircle(2, 0, 3).endFill();
        flash.visible = false;
        const tracer = new Graphics();
        const impact = new AnimatedSprite(this.#assets.getAnimationTextures("explosion"));
        impact.anchor.set(0.5);
        impact.scale.set(0.6);
        impact.animationSpeed = 1 / 3;
        impact.loop = false;
        impact.visible = false;
        impact.onComplete = () => { impact.visible = false; };
        layer.addChild(head, flash, tracer, impact);
        const closeX = dictatorStopX - 100;   // point-blank: the muzzle right at his head

        const fade = new Graphics();
        fade.beginFill(0x000000).drawRect(0, 0, this.#pixiApp.screen.width, this.#pixiApp.screen.height).endFill();
        fade.alpha = 0;
        this.#pixiApp.stage.addChild(fade);

        let phase = "explosions";
        let t = 0;
        const next = (name) => { phase = name; t = 0; };

        this.#endingTick = (delta) => {
            t += delta;
            this.#camera?.update(); // follow the hero while he walks up

            if (phase == "explosions") {
                if (t > 150) {
                    dictator.play();
                    next("walk");
                }
            }
            else if (phase == "walk") {
                // the Dictator steps out of the dark hole
                dictator.alpha = Math.min(1, dictator.alpha + 0.04 * delta);
                let dictatorDone = false;
                if (dictator.x > dictatorStopX) {
                    dictator.x = Math.max(dictatorStopX, dictator.x - 1.2 * delta);
                }
                else {
                    dictatorDone = true;
                    dictator.textures = [this.#assets.getTexture("dictatorstand0000")];
                }

                let heroDone = false;
                if (hero.x < heroStopX) {
                    heroView.flip(1);
                    heroView.showRun();
                    hero.x = Math.min(heroStopX, hero.x + 3 * delta);
                }
                else if (hero.x > heroStopX) {
                    // Boss can die with the hero standing right next to the gate -
                    // walk him back to the vantage point instead of snapping him there.
                    heroView.flip(-1);
                    heroView.showRun();
                    hero.x = Math.max(heroStopX, hero.x - 3 * delta);
                }
                else {
                    heroView.flip(1);
                    heroView.showStay();
                    heroDone = true;
                }

                if (dictatorDone && heroDone) {
                    say("Не стріляй! Я здаюся!", dictator.x, groundY - 110);
                    next("plea");
                }
            }
            else if (phase == "plea") {
                if (t > 110) {
                    bubbles.forEach((bubble) => bubble.destroy());
                    bubbles.length = 0;
                    dictator.textures = [this.#assets.getTexture("dictatorkneel0000")]; // going down
                    next("kneel");
                }
            }
            else if (phase == "kneel") {
                if (t > 18 && dictator.texture != this.#assets.getTexture("dictatorkneel0001")) {
                    dictator.textures = [this.#assets.getTexture("dictatorkneel0001")]; // on his knee, hands up
                }
                if (t > 50) {
                    say("Кінець твоїм наказам.", hero.x + 30, groundY - 110);
                    next("approach");
                }
            }
            else if (phase == "approach") {
                if (t > 70) {
                    bubbles.forEach((bubble) => bubble.destroy());
                    bubbles.length = 0;
                    if (hero.x < closeX) {
                        heroView.showRun();
                        hero.x = Math.min(closeX, hero.x + 1.6 * delta);
                    }
                    else {
                        heroView.showStay();
                        next("aim");
                    }
                }
            }
            else if (phase == "aim") {
                if (t > 30) {
                    // one shot - the head flies off, the body stays kneeling for a moment
                    flash.x = hero.x + 86;
                    flash.y = hero.y + 20;
                    flash.visible = true;
                    dictator.textures = [this.#assets.getTexture("dictatorheadless0000")];
                    head.x = dictator.x + 1;
                    head.y = dictator.y - 60;
                    head.visible = true;
                    headMotion.vx = 1.8;
                    headMotion.vy = -8;
                    // bright tracer from the muzzle into the head + a burst on impact
                    tracer.clear();
                    tracer.lineStyle(3, 0xfff3a0, 1).moveTo(flash.x + 10, flash.y).lineTo(head.x, head.y);
                    tracer.lineStyle(1, 0xffffff, 1).moveTo(flash.x + 10, flash.y).lineTo(head.x, head.y);
                    impact.x = head.x;
                    impact.y = head.y;
                    impact.visible = true;
                    impact.gotoAndPlay(0);
                    next("shot");
                }
            }
            else if (phase == "shot") {
                if (t > 6) {
                    flash.visible = false;
                    tracer.clear();
                }
                // the head: up, over and down, one bounce, then it rolls to a stop
                const headGround = groundY - 10;
                headMotion.vy += 0.3 * delta;
                head.x = Math.min(gateX - 45, head.x + headMotion.vx * delta); // stops at the wall
                head.y += headMotion.vy * delta;
                head.rotation += (headMotion.bounced ? headMotion.vx * 0.09 : 0.32) * delta; // spins in the air
                if (head.y > headGround) {
                    head.y = headGround;
                    if (!headMotion.bounced) {
                        headMotion.bounced = true;
                        headMotion.vy = -2.8;
                    }
                    else {
                        headMotion.vy = 0;
                        headMotion.vx *= 0.85;
                    }
                }
                // the body tips over backwards after a beat
                if (t > 35) {
                    dictator.rotation = Math.min(1.45, dictator.rotation + 0.06 * delta);
                }
                if (t > 170) {
                    next("hold");
                }
            }
            else if (phase == "hold") {
                if (t > 50) {
                    next("fade");
                }
            }
            else if (phase == "fade") {
                fade.alpha = Math.min(1, t / 60);
                if (fade.alpha >= 1) {
                    this.#showCredits();
                }
            }
        };
        this.#pixiApp.ticker.add(this.#endingTick);
        this.#endingFade = fade;
    }

    #endingFade;
    #creditsTick;

    #stopEndingScene() {
        if (this.#endingTick) {
            this.#pixiApp.ticker.remove(this.#endingTick);
            this.#endingTick = undefined;
        }
        this.#endingFade?.destroy();
        this.#endingFade = undefined;
    }

    #createSpeechBubble(message) {
        const bubble = new Container();
        const text = new Text(message, new TextStyle({ fontFamily: "Arial", fontWeight: "bold", fontSize: 18, fill: 0x111111 }));
        const padX = 14;
        const padY = 9;
        const w = text.width + padX * 2;
        const h = text.height + padY * 2;
        const g = new Graphics();
        g.lineStyle(3, 0x111111, 1);
        g.beginFill(0xffffff);
        g.drawRoundedRect(-w / 2, -h - 12, w, h, 10);
        g.endFill();
        g.lineStyle(0);
        g.beginFill(0xffffff);
        g.drawPolygon([-8, -14, 8, -14, 0, 0]);
        g.endFill();
        g.lineStyle(3, 0x111111, 1);
        g.moveTo(-8, -12).lineTo(0, 0).lineTo(8, -12);
        text.x = -w / 2 + padX;
        text.y = -h - 12 + padY;
        bubble.addChild(g, text);
        return bubble;
    }

    // Credits roll: the story of how Дев'ятий got it done.
    #showCredits() {
        this.#stopEndingScene();
        this.#menuMode = "credits";

        const w = this.#pixiApp.screen.width;
        const h = this.#pixiApp.screen.height;
        const container = new Container();
        const background = new Graphics();
        background.beginFill(0x000000).drawRect(0, 0, w, h).endFill();
        container.addChild(background);

        const lines = [
            ["МІСІЮ ВИКОНАНО", "title"],
            ["", ""],
            ["Цієї ночі боєць з позивним «Дев'ятий»", ""],
            ["сам-один висадився на острів Диктатора.", ""],
            ["", ""],
            ["Він пройшов крізь джунглі, річку і міст,", ""],
            ["крізь снайперів, турелі та охорону,", ""],
            ["розбив гармати на стіні", ""],
            ["і вибив броньовані ворота бункера.", ""],
            ["", ""],
            ["Диктатор вийшов з руїн і став на коліна.", ""],
            ["Це був його останній наказ самому собі.", ""],
            ["", ""],
            ["ДИКТАТОРА ЛІКВІДОВАНО", "accent"],
            ["", ""],
            ["Його армія лишилася без жодного наказу,", ""],
            ["а Дев'ятий повернувся додому героєм.", ""],
            ["", ""],
            ["", ""],
            ["ДЕВ'ЯТИЙ", "title"],
            ["Десант у бункер Диктатора", ""],
            ["", ""],
            ["Дякуємо за гру!", "accent"],
        ];
        const roll = new Container();
        let y = 0;
        lines.forEach(([line, kind]) => {
            const style = kind == "title"
                ? new TextStyle({ fontFamily: "Anton", fontSize: 54, fill: [0xfff1b8, 0xffb000], stroke: 0x3a0a05, strokeThickness: 6, letterSpacing: 4 })
                : kind == "accent"
                    ? new TextStyle({ fontFamily: "Anton", fontSize: 34, fill: 0xff4b3a, stroke: 0x000000, strokeThickness: 4, letterSpacing: 3 })
                    : new TextStyle({ fontFamily: "Arial", fontSize: 24, fill: 0xdfeffb });
            const text = new Text(line, style);
            text.anchor.set(0.5, 0);
            text.x = w / 2;
            text.y = y;
            roll.addChild(text);
            y += kind == "title" ? 76 : kind == "accent" ? 54 : 38;
        });
        roll.y = h + 20;
        container.addChild(roll);

        const hint = new Text("Enter - у головне меню", new TextStyle({ fontFamily: "Arial", fontSize: 16, fill: 0x5f7888 }));
        hint.anchor.set(1, 1);
        hint.x = w - 20;
        hint.y = h - 16;
        container.addChild(hint);

        this.#menuContainer?.destroy({ children: true });
        this.#menuContainer = container;
        this.#pixiApp.stage.addChild(container);

        const endY = -y - 20;
        this.#creditsTick = (delta) => {
            roll.y -= 0.9 * delta;
            if (roll.y < endY) {
                this.#finishCredits();
            }
        };
        this.#pixiApp.ticker.add(this.#creditsTick);
    }

    #finishCredits() {
        if (this.#creditsTick) {
            this.#pixiApp.ticker.remove(this.#creditsTick);
            this.#creditsTick = undefined;
        }
        this.#returnToMainMenu();
    }

    #showEndGame(){
        const style = new TextStyle({
            fontFamily: "Anton",
            fontSize: 50,
            fill: [0xffffff, 0xdd0000],
            stroke: 0x000000,
            strokeThickness: 5,
            letterSpacing: 12,
        })

        const text = new Text("БУНКЕР ВЗЯТО", style);
        text.x = this.#pixiApp.screen.width/2 - text.width/2;
        text.y = this.#pixiApp.screen.height/2 - text.height/2;

        const subtitle = new Text("Дев'ятий: «Штаб, ворота вибито, бункер Диктатора взято. Повертаюсь додому.»", new TextStyle({
            fontFamily: "Arial",
            fontSize: 22,
            fill: 0xa9c6d9,
        }));
        subtitle.x = this.#pixiApp.screen.width/2 - subtitle.width/2;
        subtitle.y = text.y + text.height + 20;

        const container = new Container();
        container.addChild(text, subtitle);

        this.#statusText?.destroy({ children: true });
        this.#statusText = container;
        this.#pixiApp.stage.addChild(container);

        window.setTimeout(() => {
            this.#returnToMainMenu();
        }, 4000);
    }

    #checkDamage(entity){
        // God mode only protects from damage - weapon pick-ups below must
        // still work (they used to be skipped together with the damage).
        const isHeroImmortal = entity.type == "hero" && this.#isGodModeEnabled;

        const damagers = isHeroImmortal ? [] : this.#entities.filter(damager => ((entity.type == "enemy" || entity.type == "powerupBox") && damager.type == "heroBullet")
                                                        ||(entity.type == "hero" && (damager.type == "enemyBullet" || damager.type == "enemy")));
        
        for (let damager of damagers){
            if(Physics.isCheckAABB(damager.hitBox, entity.hitBox)){
                entity.damage(damager.x, damager.y);
                // Laser bullets are piercing - they keep flying through
                // whatever they just hit instead of being destroyed on impact.
                if(damager.type != "enemy" && !damager.piercing){
                    damager.dead();
                }

                break;
            }
        }

        const powerups = this.#entities.filter(powerup => (powerup.type == "spreadgunPowerup" || powerup.type == "weaponPowerup") && entity.type == "hero");
        for(let powerup of powerups){
            if(Physics.isCheckAABB(powerup.hitBox, entity.hitBox)){
                powerup.damage();
                // "barrier" (B) is not a weapon swap - it grants a temporary
                // shield using the invulnerability the hero already supports.
                if(powerup.powerupType == "barrier"){
                    // (in god mode he already can't be hurt - and setInvulnerable
                    // would switch god mode off)
                    if (!this.#isGodModeEnabled) {
                        this.#hero.setInvulnerable(10);
                    }
                }
                else{
                    this.#weapon.setWeapon(powerup.powerupType);
                }
                break;
            }
        }
    }

    #checkPlatforms(character){
        if(character.isDead || !character.gravitable){
            return;
        }

        for (let platform of this.#platforms){
            if(character.isJumpState() && platform.type != "box" || !platform.isActive){
                continue;
            }
            this.checkPlatfromCollision(character, platform)
        }

        if(character.type == "hero" && character.x < this.#viewLeft()){
            character.x = character.prevPoint.x;
        }
    }

    checkPlatfromCollision(character, platform) {

        const prevPoint = character.prevPoint;
        const collisionResult = Physics.getOrientCollisionResult(character.collisionBox, platform.collisionBox, prevPoint);

        if (collisionResult.vertical == true) {
            character.y = prevPoint.y;
            character.stay(platform.y, platform.isWater);
        }
        if (collisionResult.horizontal == true && platform.type == "box" && !character.isForbiddenHorizontalCollision) {
            if (platform.isStep) {
                character.stay(platform.y);
            }
            else {
                character.x = prevPoint.x;
            }
        }
    }

    setKeys() {

        this.keyboardProcessor.getButton("KeyA").executeDown = function () {
            if (this.#menuMode != "playing") {
                return;
            }
            if(!this.#hero.isDead && !this.#hero.isFall && !this.#hero.isDiving){
                const bullets = this.#entities.filter(bullet => bullet.type == this.#hero.bulletContext.type);
                if(bullets.length > 10){
                    return;
                }
                this.#weapon.startFire();
                this.#hero.setView(this.getArrowButtonContext());
            }
        }
        this.keyboardProcessor.getButton("KeyA").executeUp = function () {
            if (this.#menuMode != "playing") {
                return;
            }
            if(!this.#hero.isDead && !this.#hero.isFall){
                this.#weapon.stopFire();
                this.#hero.setView(this.getArrowButtonContext());
            }
        }
        this.keyboardProcessor.getButton("KeyF").executeDown = this.keyboardProcessor.getButton("KeyA").executeDown;
        this.keyboardProcessor.getButton("KeyF").executeUp = this.keyboardProcessor.getButton("KeyA").executeUp;

        this.keyboardProcessor.getButton("KeyS").executeDown = function () {
            if (this.#menuMode != "playing") {
                return;
            }
            if (this.keyboardProcessor.isButtonPressed("ArrowDown")
                && !(this.keyboardProcessor.isButtonPressed("ArrowLeft") || this.keyboardProcessor.isButtonPressed("ArrowRight"))
                && !this.#hero.isInWater) {
                this.#hero.throwDown();
            }
            else {
                this.#hero.jump();
            }
        };
        this.keyboardProcessor.getButton("Space").executeDown = this.keyboardProcessor.getButton("KeyS").executeDown;

        const arrowLeft = this.keyboardProcessor.getButton("ArrowLeft");
        arrowLeft.executeDown = function () {
            if (this.#menuMode != "playing") {
                this.#handleMenuKey("ArrowLeft");
                return;
            }
            this.#hero.startLeftMove();
            this.#hero.setView(this.getArrowButtonContext());
        };
        arrowLeft.executeUp = function () {
            if (this.#menuMode != "playing") {
                return;
            }
            this.#hero.stopLeftMove();
            this.#hero.setView(this.getArrowButtonContext());
        };

        const arrowRight = this.keyboardProcessor.getButton("ArrowRight");
        arrowRight.executeDown = function () {
            if (this.#menuMode != "playing") {
                this.#handleMenuKey("ArrowRight");
                return;
            }
            this.#hero.startRightMove();
            this.#hero.setView(this.getArrowButtonContext());
        };
        arrowRight.executeUp = function () {
            if (this.#menuMode != "playing") {
                return;
            }
            this.#hero.stopRightMove();
            this.#hero.setView(this.getArrowButtonContext());
        };

        const arrowUp = this.keyboardProcessor.getButton("ArrowUp");
        arrowUp.executeDown = function () {
            if (this.#menuMode != "playing") {
                this.#handleMenuKey("ArrowUp");
                return;
            }
            this.#hero.setView(this.getArrowButtonContext());
        };
        arrowUp.executeUp = function () {
            if (this.#menuMode != "playing") {
                return;
            }
            this.#hero.setView(this.getArrowButtonContext());
        };

        const arrowDown = this.keyboardProcessor.getButton("ArrowDown")
        arrowDown.executeDown = function () {
            if (this.#menuMode != "playing") {
                this.#handleMenuKey("ArrowDown");
                return;
            }
            this.#hero.setView(this.getArrowButtonContext());
        };
        arrowDown.executeUp = function () {
            if (this.#menuMode != "playing") {
                return;
            }
            this.#hero.setView(this.getArrowButtonContext());
        };

        this.keyboardProcessor.getButton("Enter").executeDown = function () {
            if (this.#menuMode != "playing") {
                this.#handleMenuKey("Enter");
            }
        };

        this.keyboardProcessor.getButton("Escape").executeDown = function () {
            if (this.#menuMode == "playing") {
                this.#showPauseMenu();
            }
            else if (this.#menuMode == "pause") {
                this.#menuContainer?.destroy({ children: true });
                this.#menuContainer = undefined;
                this.#menuMode = "playing";
            }
            else if (this.#menuMode == "briefing") {
                this.#showMainMenu();
            }
        };
        this.keyboardProcessor.getButton("KeyP").executeDown = this.keyboardProcessor.getButton("Escape").executeDown;

        // TEMP DEBUG: teleport the hero to the boss for testing. Remove before ship.
        this.keyboardProcessor.getButton("KeyY").executeDown = function () {
            if (this.#menuMode != "playing") {
                return;
            }
            this.#hero.x = 6656 - 250;
            this.#hero.y = 100;
        };

    }

    getArrowButtonContext() {
        const buttonContext = {}
        buttonContext.arrowLeft = this.keyboardProcessor.isButtonPressed("ArrowLeft");
        buttonContext.arrowRight = this.keyboardProcessor.isButtonPressed("ArrowRight");
        buttonContext.arrowUp = this.keyboardProcessor.isButtonPressed("ArrowUp");
        buttonContext.arrowDown = this.keyboardProcessor.isButtonPressed("ArrowDown");
        buttonContext.shoot = this.keyboardProcessor.isButtonPressed("KeyA") || this.keyboardProcessor.isButtonPressed("KeyF");
        return buttonContext;
    }

    #checkEntityStatus(entity, index){
        if (entity.type == "hero" && this.#isScreenOut(entity)) {
            entity.dead();
        }

        if(entity.isDead || this.#isScreenOut(entity)){
            entity.removeFromStage();
            this.#entities.splice(index, 1);
            return true;
        }

        return false;
    }

    // Visible part of the level, in world units (the camera may zoom).
    #viewLeft() {
        return -this.#worldContainer.x / this.#worldContainer.scale.x;
    }
    #viewRight() {
        return (this.#pixiApp.screen.width - this.#worldContainer.x) / this.#worldContainer.scale.x;
    }
    #viewTop() {
        return -this.#worldContainer.y / this.#worldContainer.scale.y;
    }

    #isScreenOut(entity) {
        // below the level (fell into a pit) - the same fixed world line as
        // before the camera could zoom / move vertically
        const levelBottom = 768;
        if (entity.type == "heroBullet" || entity.type == "enemyBullet") {
            return (entity.x > this.#viewRight()
                || entity.x < this.#viewLeft()
                || entity.y > levelBottom
                || entity.y < this.#viewTop() - 64);
        }
        else if (entity.type == "enemy" || entity.type == "hero") {
            return entity.x < this.#viewLeft() || entity.y > levelBottom;
        }
    }
}