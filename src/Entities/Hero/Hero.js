import Entity from "../Entity.js";
import HeroWeaponUnit from "./HeroWeaponUnit.js";


const States = {
    Stay: "stay",
    Jump: "jump",
    FlyDown: "flydown",
}

export default class Hero extends Entity{

    #GRAVITY_FORCE = 0.2;
    #SPEED = 3;
    #JUMP_FORCE = 9;
    #velocityX = 0;
    #velocityY = 0;

    #movement = {
        x: 0,
        y: 0,
    }

    #directionContext = {
        left: 0,
        right: 0,
    }

    #prevPoint = {
        x: 0,
        y: 0,
    };

    #state = States.Stay;

    #isLay = false;
    #isStayUp = false;
    #isDying = false;
    #invulnerabilityFrames = 0;
    #godMode = false;
    #isInWater = false;
    #isDiving = false;

    #heroWeaponUnit;

    type = "hero";
    isFall = false;

    constructor(view) {
        super(view);

        this.#heroWeaponUnit = new HeroWeaponUnit(this._view);

        this.#state = States.Jump;
        this._view.showJump();

        this.gravitable = true;
        this.isActive = true;
    }

    get bulletContext() {
        return this.#heroWeaponUnit.bulletContext;
    }

    get prevPoint() {
        return this.#prevPoint;
    }

    get isMoving() {
        return Math.abs(this.x - this.#prevPoint.x) > 0.5 || Math.abs(this.y - this.#prevPoint.y) > 0.5;
    }

    update() {

        this.#prevPoint.x = this.x;
        this.#prevPoint.y = this.y;

        this.#isInWater = false;
        this._view.update();

        if (this.#invulnerabilityFrames > 0) {
            this.#invulnerabilityFrames--;
            this._view.setBlinking(this.#invulnerabilityFrames % 2 == 0);
            if (this.#invulnerabilityFrames == 0) {
                this._view.setBlinking(false);
            }
        }

        this.#velocityX = this.#isDiving ? 0 : this.#movement.x * this.#SPEED;
        this.x += this.#velocityX;

        if (this.#velocityY > 0) {
            if (!(this.#state == States.Jump || this.#state == States.FlyDown)) {
                this._view.showFall();
                this.isFall = true;
            }
            this.#state = States.FlyDown;
        }

        this.#velocityY += this.#GRAVITY_FORCE;
        this.y += this.#velocityY;
    }

    get isInvulnerable() {
        return this.#godMode || this.#invulnerabilityFrames > 0 || this.#isDiving;
    }

    get isInWater() {
        return this.#isInWater;
    }

    get isDiving() {
        return this.#isDiving;
    }

    setInvulnerable(seconds) {
        this.#godMode = false;
        this.#invulnerabilityFrames = Math.max(0, Math.round(seconds * 60));
        this._view.setBlinking(this.#invulnerabilityFrames > 0);
    }

    setGodMode(enabled) {
        this.#godMode = enabled;
        this.#invulnerabilityFrames = enabled ? 999999 : 0;
        this._view.setBlinking(enabled);
    }

    damage(){
        if (this.isDead || this.#isDying || this.isInvulnerable) {
            return;
        }

        this.#isDying = true;
        this.#movement.x = 0;
        this.#GRAVITY_FORCE = 0;
        this.#velocityX = 0;
        this.#velocityY = 0;

        const deadAnimation = this._view.showAndGetDeadAnimation();
        deadAnimation.onComplete = () => {
            this.dead();
            this.#isDying = false;
            deadAnimation.removeFromParent();
        }
    }

    stay(platformY, isWater = false) {

        const enteredOrLeftWater = isWater != this.#isInWater;
        this.#isInWater = isWater;
        if (!isWater) {
            this.#isDiving = false;
        }

        if (this.#state == States.Jump || this.#state == States.FlyDown || enteredOrLeftWater) {
            const fakeButtonContext = {};
            fakeButtonContext.arrowLeft = this.#movement.x == -1;
            fakeButtonContext.arrowRight = this.#movement.x == 1;
            fakeButtonContext.arrowDown = this.#isLay;
            fakeButtonContext.arrowUp = this.#isStayUp;
            this.#state = States.Stay;
            this.setView(fakeButtonContext);
            this.isFall = false;
        }

        this.#state = States.Stay;
        this.#velocityY = 0;

        this.y = platformY - this._view.collisionBox.height;
    }

    jump() {
        if (this.#state == States.Jump || this.#state == States.FlyDown) {
            return;
        }
        this.#state = States.Jump;
        this.#velocityY -= this.#JUMP_FORCE;
        this._view.showJump();
    }

    isJumpState() {
        return this.#state == States.Jump;
    }

    throwDown() {
        this.#state = States.Jump;
        this._view.showFall();
        this.isFall = true;
    }

    startLeftMove() {
        this.#directionContext.left = -1;

        if (this.#directionContext.right > 0) {
            this.#movement.x = 0;
            return;
        }

        this.#movement.x = -1;
    }

    startRightMove() {
        this.#directionContext.right = 1;

        if (this.#directionContext.left < 0) {
            this.#movement.x = 0;
            return;
        }

        this.#movement.x = 1;
    }

    stopLeftMove() {
        this.#directionContext.left = 0;
        this.#movement.x = this.#directionContext.right;
    }

    stopRightMove() {
        this.#directionContext.right = 0;
        this.#movement.x = this.#directionContext.left;
    }

    setView(buttonContext) {

        this._view.flip(this.#movement.x);
        this.#isLay = buttonContext.arrowDown;
        this.#isStayUp = buttonContext.arrowUp;

        this.#heroWeaponUnit.setBulletAngle(buttonContext, this.isJumpState());

        if (this.isJumpState() || this.#state == States.FlyDown) {
            return;
        }

        if (this.#isInWater) {
            this.#isDiving = !!buttonContext.arrowDown;

            if (this.#isDiving) {
                this._view.showDive();
            }
            else {
                this._view.showSwim();
            }
            return;
        }

        if (buttonContext.arrowLeft || buttonContext.arrowRight) {
            if (buttonContext.arrowUp) {
                this._view.showRunUp();
            }
            else if (buttonContext.arrowDown) {
                this._view.showRunDown();
            }
            else {
                if(buttonContext.shoot){
                    this._view.showRunShoot();
                }
                else{
                    this._view.showRun();
                }
            }
        }
        else {
            if (buttonContext.arrowUp) {
                this._view.showStayUp();
            }
            else if (buttonContext.arrowDown) {
                this._view.showLay();
            }
            else {
                this._view.showStay();
            }
        }
    }

    reset(){
        this.#GRAVITY_FORCE = 0.2;
        this.#isDying = false;
        this.#movement.x = 0;
        this.#velocityX = 0;
        this.#velocityY = 0;
        this.#state = States.Stay;
        this.#isInWater = false;
        this.#isDiving = false;
        this._view.reset();
        this.resuraction();
        this.setInvulnerable(3);
    }
}