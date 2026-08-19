import { Container, Graphics, Text, TextStyle } from "../lib/pixi.mjs";
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
        this.#weapon.update(this.#hero.bulletContext);

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
    }

    #returnToMainMenu() {
        this.#worldContainer?.destroy({ children: true });
        this.#worldContainer = undefined;
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
        this.#menuContainer = this.#createMenu("ВИБІР ПЕРСОНАЖА", this.#characters, "Стрілки - вибір, Enter - почати | Space - стрибок, F - вогонь, P - пауза");
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
        this.#menuContainer = this.#createMenu("ПОВЕРНІТЬ ЕКРАН", ["ГОРИЗОНТАЛЬНИЙ РЕЖИМ"], "Для гри поверніть телефон або планшет боком");
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

        if (keyName == "ArrowUp" || keyName == "ArrowDown") {
            const optionCount = this.#menuMode == "main" ? this.#characters.length : 2;
            const direction = keyName == "ArrowDown" ? 1 : -1;
            this.#selectedMenuOption = (this.#selectedMenuOption + direction + optionCount) % optionCount;
            this.#updateMenuSelection(this.#menuContainer, optionCount);
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
            this.#isEndGame = true;
            this.#showEndGame();
        }

        const isHeroDead = !this.#entities.some(e => e.type == "hero") && this.#hero.isDead;
        if(isHeroDead){
            this.#entities.push(this.#hero);
            this.#worldContainer.game.addChild(this.#hero._view);
            this.#hero.reset();
            this.#hero.x = -this.#worldContainer.x + 160;
            this.#hero.y = 100;
            this.#weapon.setWeapon(1);
        }
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

        this.#pixiApp.stage.addChild(text);
    }

    #checkDamage(entity){
        const damagers = this.#entities.filter(damager => ((entity.type == "enemy" || entity.type == "powerupBox") && damager.type == "heroBullet")
                                                        ||(entity.type == "hero" && (damager.type == "enemyBullet" || damager.type == "enemy")));
        
        for (let damager of damagers){
            if(Physics.isCheckAABB(damager.hitBox, entity.hitBox)){
                entity.damage();
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
            character.stay(platform.y);
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
            if(!this.#hero.isDead && !this.#hero.isFall){
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
                && !(this.keyboardProcessor.isButtonPressed("ArrowLeft") || this.keyboardProcessor.isButtonPressed("ArrowRight"))) {
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