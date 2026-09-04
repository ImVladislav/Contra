import { AnimatedSprite, Container, Graphics, Sprite } from "../../../lib/pixi.mjs";

export default class HeroView extends Container {

    #bounds = {
        width: 0,
        height: 0,
    }
    #collisionBox = {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
    }
    #hitBox = {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        shiftX: 0,
        shiftY: 0,
    }
    #stm = {
        currentState: "default",
        states: {}
    }

    #bulletPointShift = {
        x:0,
        y:0,
    }

    #swimAnimTime = 0;

    #rootNode;
    #assets;

    constructor(assets) {
        super();

        this.#assets = assets;

        this.#createNodeStructure();

        this.#rootNode.pivot.x = 10;
        this.#rootNode.x = 10;
        this.#bounds.width = 20;
        this.#bounds.height = 90;
        this.#collisionBox.width = this.#bounds.width;
        this.#collisionBox.height = this.#bounds.height;

        this.#stm.states.stay = this.#getStayImage();
        this.#stm.states.stayUp = this.#getStayUpImage();
        this.#stm.states.run = this.#getRunImage();
        this.#stm.states.runShoot = this.#getRunShootImage();
        this.#stm.states.runUp = this.#getRunUpImage();
        this.#stm.states.runDown = this.#getRunDownImage();
        this.#stm.states.lay = this.#getLayImage();
        this.#stm.states.jump = this.#getJumpImage();
        this.#stm.states.fall = this.#getFallImage();
        this.#stm.states.swim = this.#getSwimImage();
        this.#stm.states.dive = this.#getDiveImage();

        for (let key in this.#stm.states) {
            this.#rootNode.addChild(this.#stm.states[key])
        }
    }

    get collisionBox() {
        this.#collisionBox.x = this.x;
        this.#collisionBox.y = this.y;
        return this.#collisionBox;
    }

    get hitBox() {
        this.#hitBox.x = this.x + this.#hitBox.shiftX;
        this.#hitBox.y = this.y + this.#hitBox.shiftY;
        return this.#hitBox;
    }

    get isFliped(){
        return this.#rootNode.scale.x == -1;
    }

    get bulletPointShift(){
        return this.#bulletPointShift;
    }

    reset(){
        this.alpha = 1;
        this.#rootNode.visible = true;
        this.#collisionBox.width = this.#bounds.width;
        this.#collisionBox.height = this.#bounds.height;
    }

    update(){
        if (this.#stm.currentState == "swim" || this.#stm.currentState == "dive") {
            this.#swimAnimTime += 0.12;
            this.#stm.states[this.#stm.currentState].y = Math.sin(this.#swimAnimTime) * 3;
        }
    }

    setBlinking(isBlinking) {
        this.alpha = isBlinking ? 0.35 : 1;
    }

    showAndGetDeadAnimation(){
        this.#rootNode.visible = false;
        this.#collisionBox.width = 0;
        this.#collisionBox.height = 0;

        const explosion = new AnimatedSprite(this.#assets.getAnimationTextures("explosion"));
        explosion.animationSpeed = 1/5;
        explosion.x = -explosion.width/2;
        explosion.loop = false;
        explosion.play();
        this.addChild(explosion);

        return explosion;
    }
    
    showStay() {
        this.#toState("stay");
        this.#setBulletPointShift(50, 29);

        this.#hitBox.width = 20;
        this.#hitBox.height = 90;
        this.#hitBox.shiftX = 0;
        this.#hitBox.shiftY = 0;
    }

    showStayUp() {
        this.#toState("stayUp");
        this.#setBulletPointShift(18, -30);

        this.#hitBox.width = 20;
        this.#hitBox.height = 90;
        this.#hitBox.shiftX = 0;
        this.#hitBox.shiftY = 0;
    }

    showRun() {
        this.#toState("run");
        this.#setBulletPointShift(65, 30);

        this.#hitBox.width = 20;
        this.#hitBox.height = 90;
        this.#hitBox.shiftX = 0;
        this.#hitBox.shiftY = 0;
    }

    showRunShoot() {
        this.#toState("runShoot");
        this.#setBulletPointShift(50, 29);

        this.#hitBox.width = 20;
        this.#hitBox.height = 90;
        this.#hitBox.shiftX = 0;
        this.#hitBox.shiftY = 0;
    }

    showRunUp() {
        this.#toState("runUp");
        this.#setBulletPointShift(40, 0);

        this.#hitBox.width = 20;
        this.#hitBox.height = 90;
        this.#hitBox.shiftX = 0;
        this.#hitBox.shiftY = 0;
    }

    showRunDown() {
        this.#toState("runDown");
        this.#setBulletPointShift(47, 50);

        this.#hitBox.width = 20;
        this.#hitBox.height = 90;
        this.#hitBox.shiftX = 0;
        this.#hitBox.shiftY = 0;
    }

    showLay() {
        this.#toState("lay");
        this.#setBulletPointShift(50, 70);

        this.#hitBox.width = 90;
        this.#hitBox.height = 20;
        this.#hitBox.shiftX = -45;
        this.#hitBox.shiftY = 70;
    }

    showJump() {
        this.#toState("jump");
        this.#setBulletPointShift(-2, 40);

        this.#hitBox.width = 40;
        this.#hitBox.height = 40;
        this.#hitBox.shiftX = -10;
        this.#hitBox.shiftY = 25;
    }

    showFall() {
        this.#toState("fall");

        this.#hitBox.width = 20;
        this.#hitBox.height = 90;
        this.#hitBox.shiftX = 0;
        this.#hitBox.shiftY = 0;
    }

    showSwim() {
        this.#toState("swim");
        this.#setBulletPointShift(55, 65);

        this.#hitBox.width = 40;
        this.#hitBox.height = 30;
        this.#hitBox.shiftX = -5;
        this.#hitBox.shiftY = 55;
    }

    showDive() {
        this.#toState("dive");
        this.#setBulletPointShift(35, 75);

        this.#hitBox.width = 34;
        this.#hitBox.height = 26;
        this.#hitBox.shiftX = -3;
        this.#hitBox.shiftY = 58;
    }

    flip(direction) {
        switch (direction) {
            case 1:
            case -1:
                this.#rootNode.scale.x = direction;
        }
    }

    #toState(key) {
        if (this.#stm.currentState == key) {
            return;
        }
        for (let key in this.#stm.states) {
            this.#stm.states[key].visible = false;
        }
        this.#stm.states[key].visible = true;
        this.#stm.currentState = key;
    }

    #createNodeStructure() {
        const rootNode = new Container();
        this.addChild(rootNode);
        this.#rootNode = rootNode;
    }

    #setBulletPointShift(x, y){
        this.#bulletPointShift.x = (x + this.#rootNode.pivot.x * this.#rootNode.scale.x) * this.#rootNode.scale.x;
        this.#bulletPointShift.y = y;
    }

    #getStayImage() {
        const view = new Sprite(this.#assets.getTexture("stay0000"));
        return view;
    }

    #getStayUpImage() {
        const view = new Sprite(this.#assets.getTexture("stayup0000"));
        view.x += 2;
        view.y -= 31;
        return view;
    }

    #getRunImage() {
        const view = new AnimatedSprite(this.#assets.getAnimationTextures("run"));
        view.animationSpeed = 1 / 10;
        view.play();
        view.y -= 3;
        return view;
    }

    #getRunShootImage() {

        const container = new Container();

        const upperPart = new Sprite(this.#assets.getTexture("stay0000"));
        upperPart.x = 8;
        upperPart.y = 2;

        const upperPartMask = new Graphics();
        upperPartMask.beginFill(0xffffff);
        upperPartMask.drawRect(0,0,100,45);

        upperPart.mask = upperPartMask;

        const bottomPart = new AnimatedSprite(this.#assets.getAnimationTextures("run"));
        bottomPart.animationSpeed = 1 / 10;
        bottomPart.play();
        bottomPart.y -= 3;

        const bottomPartMask = new Graphics();
        bottomPartMask.beginFill(0xffffff);
        bottomPartMask.drawRect(0,45,100,45);

        bottomPart.mask = bottomPartMask;

        container.addChild(upperPart);
        container.addChild(bottomPart);
        container.addChild(upperPartMask);
        container.addChild(bottomPartMask);

        return container;
    }

    #getRunUpImage() {
        const view = new AnimatedSprite(this.#assets.getAnimationTextures("runup"));
        view.animationSpeed = 1 / 10;
        view.play();
        view.y -= 3;
        return view;
    }

    #getRunDownImage() {
        const view = new AnimatedSprite(this.#assets.getAnimationTextures("rundown"));
        view.animationSpeed = 1 / 10;
        view.play();
        view.y -= 3;
        return view;
    }

    #getLayImage() {
        const view = new Sprite(this.#assets.getTexture("lay0000"));
        view.x -= 25;
        view.y += 50;
        return view;
    }

    #getJumpImage() {
        const view = new AnimatedSprite(this.#assets.getAnimationTextures("jump"));
        view.animationSpeed = 1 / 10;
        view.play();
        view.y -= 3;
        view.x -= 10;
        return view;
    }

    #getFallImage() {
        const view = new Sprite(this.#assets.getTexture("run0003"));
        return view;
    }

    // Placeholder graphics until real swim/dive sprites exist.
    // Water tiles render on the foreground layer (on top of the hero), which
    // covers roughly the bottom third of the hero's bounding box - keep these
    // shapes above that line (local y below ~60) or they're invisible.
    #getSwimImage() {
        const container = new Container();

        const wake = new Graphics();
        wake.lineStyle(2, 0x8fd3f4, 0.6);
        wake.moveTo(-6, 46);
        wake.lineTo(34, 46);

        const body = new Graphics();
        body.beginFill(0x2f6690);
        body.drawRoundedRect(-4, 30, 34, 16, 8);
        body.endFill();

        const head = new Graphics();
        head.beginFill(0xe0a679);
        head.drawCircle(26, 28, 8);
        head.endFill();

        container.addChild(wake, body, head);
        return container;
    }

    #getDiveImage() {
        const container = new Container();

        // Shield ring makes the invulnerable dive state readable at a glance.
        const shield = new Graphics();
        shield.lineStyle(2, 0xbfe6ff, 0.8);
        shield.drawCircle(14, 40, 24);

        const body = new Graphics();
        body.beginFill(0x1c4e73, 0.9);
        body.drawEllipse(14, 40, 20, 12);
        body.endFill();

        const bubbleA = new Graphics();
        bubbleA.beginFill(0xbfe6ff, 0.75);
        bubbleA.drawCircle(20, 18, 3);
        bubbleA.endFill();

        const bubbleB = new Graphics();
        bubbleB.beginFill(0xbfe6ff, 0.5);
        bubbleB.drawCircle(12, 6, 2);
        bubbleB.endFill();

        container.addChild(shield, body, bubbleA, bubbleB);
        return container;
    }
}