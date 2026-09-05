import { Container, Graphics, Sprite, Text, TextStyle } from "../lib/pixi.mjs";
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
    #characters = ["Крам", "ДжастВ"];
    #orientationReturnMode = "main";
    #heroIntroOverlay;
    #isGodModeEnabled = false;
    #lives = 3;
    #livesText;
    #statusText;

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

            if(entity.type == "hero" || entity.type == "enemy" || entity.type == "powerupBox" || entity.type == "spreadgunPowerup"){
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
        this.#pixiApp.stage.addChild(this.#worldContainer);
        this.#bulletFactory = new BulletFactory(this.#worldContainer.game, this.#entities);

        const heroFactory = new HeroFactory(this.#worldContainer.game, this.#assets);
        this.#hero = heroFactory.create(160, 100);
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

        this.#lives = 3;
        this.#livesText?.destroy({ children: true });
        this.#livesText = new Container();
        this.#livesText.x = 16;
        this.#livesText.y = 12;
        this.#pixiApp.stage.addChild(this.#livesText);
        this.#updateLivesText();
    }

    // Remaining lives shown as a row of small hero icons (classic arcade HUD).
    #updateLivesText() {
        if (!this.#livesText) {
            return;
        }
        this.#livesText.removeChildren().forEach((child) => child.destroy());

        const tint = this.#getSelectedProfile().tint;
        for (let i = 0; i < this.#lives; i++) {
            const icon = new Sprite(this.#assets.getTexture("stay0000"));
            icon.scale.set(0.4);
            icon.tint = tint;
            icon.x = i * 32;
            this.#livesText.addChild(icon);
        }
    }

    #returnToMainMenu() {
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
        this.#menuContainer = this.#createCharacterSelectMenu();
        this.#createGodModeCheckbox();
    }

    #getSelectedProfile() {
        const heroProfiles = this.#getHeroProfiles();
        return heroProfiles[this.#characters[this.#selectedMenuOption]] ?? heroProfiles["Крам"];
    }

    #getHeroProfiles() {
        return {
            "Крам": {
                portrait: "К",
                text: "Слухай, тут немає часу на розмови. Ставимося до роботи як до бою.",
                accent: 0xff6b4a,
                tint: 0xffffff,
            },
            "ДжастВ": {
                portrait: "Д",
                text: "Відмінна команда, рота. Поки я в живих, ми йдемо далі.",
                accent: 0x4ab0ff,
                tint: 0x9fd0ff,
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
        const heroProfiles = this.#getHeroProfiles();
        const profile = heroProfiles[this.#characters[this.#selectedMenuOption]] ?? heroProfiles["Крам"];
        const container = this.#pixiApp.view.parentElement ?? document.body;
        const intro = document.createElement("div");
        intro.className = "hero-intro";
        intro.innerHTML = `
            <div class="hero-intro__card">
                <div class="hero-intro__portrait"><img src="assets/sprites/stay0000.png" alt="" style="height:64px;image-rendering:pixelated;filter:${profile.tint == 0xffffff ? "none" : "hue-rotate(200deg) saturate(0.9)"}"></div>
                <div class="hero-intro__body">
                    <div class="hero-intro__name">${this.#characters[this.#selectedMenuOption]}</div>
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
        }, 3000);
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
        this.#updateMenuSelection(container, options.length);
        this.#pixiApp.stage.addChild(container);
        return container;
    }

    #createCharacterSelectMenu() {
        const container = new Container();
        const background = new Graphics();
        background.beginFill(0x07131f, 0.92).drawRect(0, 0, this.#pixiApp.screen.width, this.#pixiApp.screen.height).endFill();
        container.addChild(background);

        const titleStyle = new TextStyle({ fontFamily: "Impact", fontSize: 52, fill: 0xffd166, stroke: 0x000000, strokeThickness: 6 });
        const titleText = new Text("ВИБІР ПЕРСОНАЖА", titleStyle);
        titleText.anchor.set(0.5);
        titleText.x = this.#pixiApp.screen.width / 2;
        titleText.y = 130;
        container.addChild(titleText);

        const cardWidth = 220;
        const cardHeight = 300;
        const gap = 50;
        const totalWidth = this.#characters.length * cardWidth + (this.#characters.length - 1) * gap;
        const startX = this.#pixiApp.screen.width / 2 - totalWidth / 2;
        const cardY = 200;

        const heroProfiles = this.#getHeroProfiles();

        this.#characters.forEach((name, index) => {
            const profile = heroProfiles[name] ?? heroProfiles["Крам"];
            const card = this.#buildCharacterCard(name, profile, cardWidth, cardHeight);
            card.x = startX + index * (cardWidth + gap);
            card.y = cardY;
            card.name = `menu-option-${index}`;
            container.addChild(card);
        });

        const hintText = new Text(
            "Стрілки - вибір, Enter - почати | Space - стрибок, F - вогонь, P - пауза",
            new TextStyle({ fontFamily: "Arial", fontSize: 18, fill: 0xa9c6d9 })
        );
        hintText.anchor.set(0.5);
        hintText.x = this.#pixiApp.screen.width / 2;
        hintText.y = 560;
        container.addChild(hintText);

        this.#updateCharacterCardSelection(container);
        this.#pixiApp.stage.addChild(container);
        return container;
    }

    #buildCharacterCard(name, profile, width, height) {
        const card = new Container();
        card.cardWidth = width;
        card.cardHeight = height;

        const background = new Graphics();
        card.addChild(background);
        card.background = background;

        const portraitSize = width - 40;
        const portrait = this.#buildPortrait(profile, portraitSize);
        portrait.x = 20;
        portrait.y = 20;
        card.addChild(portrait);

        const nameText = new Text(name, new TextStyle({ fontFamily: "Impact", fontSize: 30, fill: 0xffffff, stroke: 0x000000, strokeThickness: 4 }));
        nameText.anchor.set(0.5, 0);
        nameText.x = width / 2;
        nameText.y = portraitSize + 30;
        card.addChild(nameText);
        card.nameText = nameText;

        return card;
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

    #updateCharacterCardSelection(container) {
        this.#characters.forEach((_, index) => {
            const card = container.getChildByName(`menu-option-${index}`);
            const isSelected = index == this.#selectedMenuOption;
            const borderColor = isSelected ? 0xffd166 : 0x2d5d75;
            const fillColor = isSelected ? 0x14283a : 0x0b1925;

            card.background.clear();
            card.background.lineStyle(isSelected ? 4 : 2, borderColor, 1);
            card.background.beginFill(fillColor, 0.92);
            card.background.drawRoundedRect(0, 0, card.cardWidth, card.cardHeight, 14);
            card.background.endFill();

            card.nameText.style.fill = isSelected ? 0xffd166 : 0xffffff;
        });
    }

    #updateMenuSelection(container, optionCount) {
        for (let index = 0; index < optionCount; index++) {
            const option = container.getChildByName(`menu-option-${index}`);
            option.style.fill = index == this.#selectedMenuOption ? 0xffd166 : 0xffffff;
        }
    }

    #handleMenuKey(keyName) {
        if (this.#menuMode == "orientation") {
            return;
        }

        const isNextKey = keyName == "ArrowDown" || keyName == "ArrowRight";
        const isPrevKey = keyName == "ArrowUp" || keyName == "ArrowLeft";
        if (isNextKey || isPrevKey) {
            const optionCount = this.#menuMode == "main" ? this.#characters.length : 2;
            const direction = isNextKey ? 1 : -1;
            this.#selectedMenuOption = (this.#selectedMenuOption + direction + optionCount) % optionCount;

            if (this.#menuMode == "main") {
                this.#updateCharacterCardSelection(this.#menuContainer);
            }
            else {
                this.#updateMenuSelection(this.#menuContainer, optionCount);
            }
            return;
        }

        if (keyName != "Enter") {
            return;
        }

        if (this.#menuMode == "main") {
            this.#startGame();
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
            this.#showEndGame();
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

    #showGameOver(){
        const style = new TextStyle({
            fontFamily: "Impact",
            fontSize: 50,
            fill: [0xffffff, 0xdd0000],
            stroke: 0x000000,
            strokeThickness: 5,
            letterSpacing: 30,
        })

        const text = new Text("GAME OVER", style);
        text.x = this.#pixiApp.screen.width/2 - text.width/2;
        text.y = this.#pixiApp.screen.height/2 - text.height/2;

        this.#statusText?.destroy({ children: true });
        this.#statusText = text;
        this.#pixiApp.stage.addChild(text);

        window.setTimeout(() => {
            this.#returnToMainMenu();
        }, 3000);
    }

    #showEndGame(){
        const style = new TextStyle({
            fontFamily: "Impact",
            fontSize: 50,
            fill: [0xffffff, 0xdd0000],
            stroke: 0x000000,
            strokeThickness: 5,
            letterSpacing: 30,
        })

        const text = new Text("STAGE CLEAR", style);
        text.x = this.#pixiApp.screen.width/2 - text.width/2;
        text.y = this.#pixiApp.screen.height/2 - text.height/2;

        const subtitle = new Text("Вітаємо! Місію виконано.", new TextStyle({
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
                if(damager.type != "enemy"){
                    damager.dead();
                }

                break;
            }
        }

        const powerups = this.#entities.filter(powerup => powerup.type == "spreadgunPowerup" && entity.type == "hero");
        for(let powerup of powerups){
            if(Physics.isCheckAABB(powerup.hitBox, entity.hitBox)){
                powerup.damage();
                this.#weapon.setWeapon(powerup.powerupType);
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
        };
        this.keyboardProcessor.getButton("KeyP").executeDown = this.keyboardProcessor.getButton("Escape").executeDown;
    }

    getArrowButtonContext() {
        const buttonContext = {}
        buttonContext.arrowLeft = this.keyboardProcessor.isButtonPressed("ArrowLeft");
        buttonContext.arrowRight = this.keyboardProcessor.isButtonPressed("ArrowRight");
        buttonContext.arrowUp = this.keyboardProcessor.isButtonPressed("ArrowUp");
        buttonContext.arrowDown = this.keyboardProcessor.isButtonPressed("ArrowDown");
        buttonContext.shoot = this.keyboardProcessor.isButtonPressed("KeyA");
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