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

    // Swim: the real hero sprite, sunk so only head and shoulders show
    // above the water tiles (water renders on the foreground layer).
    #getSwimImage() {
        const container = new Container();

        const body = new Sprite(this.#assets.getTexture("stay0000"));
        body.y = 38;

        const wake = new Graphics();
        wake.lineStyle(2, 0xbfe6ff, 0.55);
        wake.moveTo(-14, 58);
        wake.lineTo(48, 58);

        container.addChild(body, wake);
        return container;
    }

    // Dive: hero is fully under water - only bubbles give away the position.
    #getDiveImage() {
        const container = new Container();

        const bubbleA = new Graphics();
        bubbleA.beginFill(0xbfe6ff, 0.75);
        bubbleA.drawCircle(20, 50, 3);
        bubbleA.endFill();

        const bubbleB = new Graphics();
        bubbleB.beginFill(0xbfe6ff, 0.5);
        bubbleB.drawCircle(10, 42, 2);
        bubbleB.endFill();

        const bubbleC = new Graphics();
        bubbleC.beginFill(0xbfe6ff, 0.6);
        bubbleC.drawCircle(28, 40, 2);
        bubbleC.endFill();

        container.addChild(bubbleA, bubbleB, bubbleC);
        return container;
    }

    // Recolours every sprite of the hero (used for the second character).
    setTint(color) {
        const apply = (node) => {
            if (node instanceof Sprite) {
                node.tint = color;
            }
            node.children?.forEach(apply);
        };
        apply(this.#rootNode);
    }
}