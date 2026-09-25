import { AnimatedSprite, Container, Graphics, Sprite, Text, TextStyle } from "../lib/pixi.mjs";
import Camera from "./Camera.js";
import BulletFactory from "./Entities/Bullets/BulletFactory.js";
import EnemiesFactory from "./Entities/Enemies/EnemiesFactory.js";
import HeroFactory from "./Entities/Hero/HeroFactory.js";
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

    keyboardProcessor;

    constructor(pixiApp, assets) {
        this.#pixiApp = pixiApp;
        this.#assets = assets;

        this.#pixiApp.stage.addChild(new StaticBackground(this.#pixiApp.screen, assets));
        this.keyboardProcessor = new KeyboardProcessor(this);
        this.setKeys();
        this.#showMainMenu();
    }

    update(){
        if (this.#menuMode != "playing") {
            return;
        }

        for(let i = 0; i < this.#entities.length; i++){
            const entity = this.#entities[i];
            entity.update();

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
            this.#weapon.update(this.#hero.bulletContext);
        }

        this.#checkGameStatus();
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
        });
        this.#weapon = new Weapon(this.#bulletFactory);
        this.#weapon.setWeapon(1);

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
        this.#menuContainer = this.#createMenu("ПАУЗА", ["Продовжити", "Головне меню"], "Стрілки - вибір, Enter - підтвердити");
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

        const titleStyle = new TextStyle({ fontFamily: "Impact", fontSize: 56, fill: 0xffd166, stroke: 0x000000, strokeThickness: 6 });
        const hintStyle = new TextStyle({ fontFamily: "Arial", fontSize: 18, fill: 0xa9c6d9 });

        const titleText = new Text(title, titleStyle);
        titleText.anchor.set(0.5);
        titleText.x = this.#pixiApp.screen.width / 2;
        titleText.y = 190;
        container.addChild(titleText);

        options.forEach((option, index) => {
            const text = new Text(option, new TextStyle({ fontFamily: "Impact", fontSize: 34, fill: 0xffffff, stroke: 0x000000, strokeThickness: 4 }));
            text.anchor.set(0.5);
            text.x = this.#pixiApp.screen.width / 2;
            text.y = 330 + index * 65;
            text.name = `menu-option-${index}`;
            container.addChild(text);
        });

        const hintText = new Text(hint, hintStyle);
        hintText.anchor.set(0.5);
        hintText.x = this.#pixiApp.screen.width / 2;
        hintText.y = 560;
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
        background.beginFill(0x050b12, 0.86).drawRect(0, 0, w, h).endFill();
        // soft red glow behind the title (a few stacked ellipses)
        for (let k = 0; k < 6; k++) {
            background.beginFill(0x8a1a12, 0.07).drawEllipse(w / 2, 180, 470 - k * 55, 135 - k * 18).endFill();
        }
        background.beginFill(0x000000, 0.35).drawRect(0, h - 90, w, 90).endFill();
        container.addChild(background);

        const operation = new Text("ОПЕРАЦІЯ", new TextStyle({ fontFamily: "Arial", fontWeight: "bold", fontSize: 20, fill: 0xa9c6d9, letterSpacing: 12 }));
        operation.anchor.set(0.5);
        operation.x = w / 2;
        operation.y = 88;
        container.addChild(operation);

        const title = new Text("ДЕВ'ЯТИЙ", new TextStyle({
            fontFamily: "Impact",
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

        const subtitle = new Text("ДЕСАНТ У БУНКЕР ДИКТАТОРА", new TextStyle({ fontFamily: "Impact", fontSize: 32, fill: 0xff4b3a, stroke: 0x000000, strokeThickness: 5, letterSpacing: 5 }));
        subtitle.anchor.set(0.5);
        subtitle.x = w / 2;
        subtitle.y = 272;
        container.addChild(subtitle);

        const portrait = this.#buildPortrait(this.#getSelectedProfile(), 250);
        portrait.x = w / 2 - 330;
        portrait.y = 330;
        container.addChild(portrait);

        const callsign = new Text("позивний «Дев'ятий»", new TextStyle({ fontFamily: "Arial", fontSize: 18, fill: 0xa9c6d9, fontStyle: "italic" }));
        callsign.anchor.set(0.5, 0);
        callsign.x = portrait.x + 125;
        callsign.y = 592;
        container.addChild(callsign);

        const options = ["ПОЧАТИ МІСІЮ", "БРИФІНГ"];
        options.forEach((option, index) => {
            const text = new Text(option, new TextStyle({ fontFamily: "Impact", fontSize: 44, fill: 0xffffff, stroke: 0x000000, strokeThickness: 5, letterSpacing: 2 }));
            text.baseText = option;
            text.x = w / 2 + 10;
            text.y = 390 + index * 80;
            text.name = `menu-option-${index}`;
            container.addChild(text);
        });

        const hintText = new Text(
            "Стрілки - вибір, Enter - підтвердити  |  Space - стрибок, F - вогонь, P - пауза",
            new TextStyle({ fontFamily: "Arial", fontSize: 18, fill: 0xa9c6d9 })
        );
        hintText.anchor.set(0.5);
        hintText.x = w / 2;
        hintText.y = h - 45;
        container.addChild(hintText);

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

        const background = new Graphics();
        background.beginFill(0x050b12, 0.94).drawRect(0, 0, w, h).endFill();
        background.lineStyle(2, 0xffd166, 0.5).drawRoundedRect(60, 40, w - 120, h - 150, 16);
        container.addChild(background);

        const header = new Text("БРИФІНГ", new TextStyle({ fontFamily: "Impact", fontSize: 54, fill: 0xffd166, stroke: 0x000000, strokeThickness: 6, letterSpacing: 4 }));
        header.anchor.set(0.5, 0);
        header.x = w / 2;
        header.y = 60;
        container.addChild(header);

        const stamp = new Text("ЦІЛКОМ ТАЄМНО  ·  ДЛЯ ПОЗИВНОГО «ДЕВ'ЯТИЙ»", new TextStyle({ fontFamily: "Arial", fontWeight: "bold", fontSize: 15, fill: 0xff4b3a, letterSpacing: 3 }));
        stamp.anchor.set(0.5, 0);
        stamp.x = w / 2;
        stamp.y = 128;
        container.addChild(stamp);

        const lore = [
            "Диктатор сховався в бункері на далекому острові посеред джунглів. Звідти він віддає накази своїй армії і певен, що до нього ніхто не дістанеться.",
            "Розвідка знайшла шлях: річка, міст, скелі й густі джунглі, а за ними — сталева стіна бункера з двома гарматами і броньованими воротами.",
            "Велика група не пройде непомітно. Тому цієї ночі висаджується один боєць — позивний «Дев'ятий».",
            "Завдання: пройти крізь охорону, підбирати зброю зі збитих капсул постачання, розбити гармати на стіні й вибити ворота бункера.",
            "Зв'язок — лише після висадки і після штурму. Удачі, Дев'ятий.",
        ].join("\n\n");
        const body = new Text(lore, new TextStyle({
            fontFamily: "Arial",
            fontSize: 20,
            lineHeight: 29,
            fill: 0xdfeffb,
            wordWrap: true,
            wordWrapWidth: w - 220,
        }));
        body.x = 110;
        body.y = 170;
        container.addChild(body);

        const options = ["ПОЧАТИ МІСІЮ", "НАЗАД"];
        options.forEach((option, index) => {
            const text = new Text(option, new TextStyle({ fontFamily: "Impact", fontSize: 36, fill: 0xffffff, stroke: 0x000000, strokeThickness: 4, letterSpacing: 2 }));
            text.baseText = option;
            text.anchor.set(0, 0.5);
            text.x = index == 0 ? w / 2 - 280 : w / 2 + 100;
            text.y = h - 70;
            text.name = `menu-option-${index}`;
            container.addChild(text);
        });

        container.optionCount = options.length;
        this.#updateMenuSelection(container, options.length);
        this.#pixiApp.stage.addChild(container);
        return container;
    }

    // Portrait = the actual in-game hero sprite, scaled up, pixel-crisp.
    #buildPortrait(profile, size) {
        const container = new Container();

        const bg = new Graphics();
        bg.beginFill(0x1c2f40);
        bg.drawRoundedRect(0, 0, size, size, 10);
        bg.endFill();
        bg.beginFill(profile.accent, 0.18);
        bg.drawCircle(size / 2, size / 2, size * 0.42);
        bg.endFill();
        container.addChild(bg);

        const ground = new Sprite(this.#assets.getTexture("platform0000"));
        ground.width = size;
        ground.height = size * 0.35;
        ground.y = size - ground.height + 6;
        const groundMask = new Graphics();
        groundMask.beginFill(0xffffff);
        groundMask.drawRoundedRect(0, 0, size, size, 10);
        groundMask.endFill();
        ground.mask = groundMask;
        container.addChild(ground, groundMask);

        const hero = new Sprite(this.#assets.getTexture("stay0000"));
        const scale = (size * 0.78) / hero.texture.height;
        hero.scale.set(scale);
        hero.tint = profile.tint;
        hero.anchor.set(0.5, 1);
        hero.x = size / 2;
        hero.y = size - size * 0.08;
        container.addChild(hero);

        return container;
    }

    #updateMenuSelection(container, optionCount) {
        for (let index = 0; index < optionCount; index++) {
            const option = container.getChildByName(`menu-option-${index}`);
            const isSelected = index == this.#selectedMenuOption;
            option.style.fill = isSelected ? 0xffd166 : 0xffffff;
            if (option.baseText) {
                option.text = isSelected ? `► ${option.baseText}` : option.baseText;
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
            this.#hero.x = -this.#worldContainer.x + 160;
            this.#hero.y = 100;
            this.#weapon.setWeapon(1);
        }
    }

    // The authentic pixel-font GAME OVER graphic from the ROM, tinted per
    // player color, instead of a rendered web font.
    #showGameOver(){
        const texture = this.#assets.getTexture(this.#activeCharacterIndex == 1 ? "player_2_game_over" : "player_1_game_over");
        const sprite = new Sprite(texture);
        sprite.scale.set(6);
        sprite.x = this.#pixiApp.screen.width/2 - sprite.width/2;
        sprite.y = this.#pixiApp.screen.height/2 - sprite.height/2;

        const line = new Text("Дев'ятий не виходить на зв'язок...", new TextStyle({
            fontFamily: "Arial",
            fontSize: 22,
            fill: 0xa9c6d9,
        }));
        line.x = this.#pixiApp.screen.width/2 - line.width/2;
        line.y = sprite.y + sprite.height + 24;

        const gameOver = new Container();
        gameOver.addChild(sprite, line);

        this.#statusText?.destroy({ children: true });
        this.#statusText = gameOver;
        this.#pixiApp.stage.addChild(gameOver);

        window.setTimeout(() => {
            this.#returnToMainMenu();
        }, 3000);
    }

    // ---- Ending --------------------------------------------------------------
    // The bunker gate is blown open: the Dictator walks out of the hole,
    // the hero walks up to him, he drops to his knees with his hands up, the
    // hero pats him on the head - then fade out and the credits roll.
    #startEnding() {
        this.#menuMode = "cutscene";
        this.keyboardProcessor.releaseAll();
        this.#weapon?.stopFire();
        this.#heroIntroOverlay?.remove();

        // no bullets frozen in the air during the scene
        this.#entities = this.#entities.filter((entity) => {
            if (entity.type == "heroBullet" || entity.type == "enemyBullet") {
                entity.removeFromStage();
                return false;
            }
            return true;
        });

        const layer = this.#worldContainer.game;
        const groundY = 720;                     // boss approach tier
        const gateX = 128 * 52 - 42.4 + 43;      // centre of the bunker gate
        const dictatorStopX = gateX - 110;
        const heroStopX = dictatorStopX - 115;

        const walkTextures = ["dictator0001", "dictator0000", "dictator0002", "dictator0000"].map((name) => this.#assets.getTexture(name));
        const dictator = new AnimatedSprite(walkTextures);
        dictator.animationSpeed = 1 / 8;
        dictator.anchor.set(0.5, 1);
        dictator.scale.set(2);
        dictator.x = gateX;
        dictator.y = groundY + 2;
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

        const sleeve = new Graphics();
        const hand = new Sprite(this.#assets.getTexture("pathand0000"));
        hand.scale.set(2);
        hand.anchor.set(1, 0.5);
        hand.visible = false;
        layer.addChild(sleeve, hand);

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
                    dictator.gotoAndStop(1);
                }

                let heroDone = false;
                if (hero.x < heroStopX) {
                    heroView.showRun();
                    hero.x = Math.min(heroStopX, hero.x + 3 * delta);
                }
                else {
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
                    dictator.textures = [this.#assets.getTexture("dictatorkneel0000")];
                    say("Сиди тихо.", hero.x + 30, groundY - 110);
                    next("kneel");
                }
            }
            else if (phase == "kneel") {
                if (t > 80) {
                    bubbles.forEach((bubble) => bubble.destroy());
                    bubbles.length = 0;
                    hand.visible = true;
                    next("pat");
                }
            }
            else if (phase == "pat") {
                // four pats on the cap, the sleeve reaching from the hero's shoulder
                const bob = Math.abs(Math.sin(t * 0.14)) * 10;
                const shoulderX = hero.x + 36;
                const shoulderY = groundY - 72;
                hand.x = dictator.x + 6;
                hand.y = groundY - 76 - bob;
                sleeve.clear();
                sleeve.lineStyle(9, 0x2c2a22, 1);
                sleeve.moveTo(shoulderX, shoulderY);
                sleeve.lineTo(hand.x - 22, hand.y);
                sleeve.lineStyle(6, 0x5a6043, 1);
                sleeve.moveTo(shoulderX, shoulderY);
                sleeve.lineTo(hand.x - 22, hand.y);
                if (t > 4 * Math.PI / 0.14) {
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
                ? new TextStyle({ fontFamily: "Impact", fontSize: 54, fill: [0xfff1b8, 0xffb000], stroke: 0x3a0a05, strokeThickness: 6, letterSpacing: 4 })
                : kind == "accent"
                    ? new TextStyle({ fontFamily: "Impact", fontSize: 34, fill: 0xff4b3a, stroke: 0x000000, strokeThickness: 4, letterSpacing: 3 })
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
            fontFamily: "Impact",
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
        if (entity.type == "hero" && this.#isGodModeEnabled) {
            return;
        }

        const damagers = this.#entities.filter(damager => ((entity.type == "enemy" || entity.type == "powerupBox") && damager.type == "heroBullet")
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
                    this.#hero.setInvulnerable(10);
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

        if(character.type == "hero" && character.x < -this.#worldContainer.x){
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

    #isScreenOut(entity) {
        if (entity.type == "heroBullet" || entity.type == "enemyBullet") {
            return (entity.x > (this.#pixiApp.screen.width - this.#worldContainer.x)
                || entity.x < (-this.#worldContainer.x)
                || entity.y > this.#pixiApp.screen.height
                || entity.y < 0);
        }
        else if (entity.type == "enemy" || entity.type == "hero") {
            return entity.x < (-this.#worldContainer.x) || entity.y > this.#pixiApp.screen.height;
        }
    }
}