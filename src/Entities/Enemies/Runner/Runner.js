import Entity from "../../Entity.js";

const States = {
    Stay: "stay",
    Jump: "jump",
    FlyDown: "flydown",
}

export default class Runner extends Entity{

    #GRAVITY_FORCE = 0.2;
    #SPEED = 3;
    #JUMP_FORCE = 9;
    #velocityX = 0;
    #velocityY = 0;

    #movement = {
        x: 0,
        y: 0,
    }

    #prevPoint = {
        x: 0,
        y: 0,
    };

    #target;
    #state = States.Stay;
    #jumpTimer = 0;
    #isDying = false;

    type = "enemy";

    jumpBehaviorKoef = 0.4;

    constructor(view, target) {
        super(view);

        this.#target = target;

        this.#state = States.Jump;
        this._view.showJump();

        this.#movement.x = -1;

        this.gravitable = true;
        this.isActive = false;
    }


    get collisionBox() {
        return this._view.collisionBox;
    }

    get x() {
        return this._view.x;
    }
    set x(value) {
        this._view.x = value;
    }
    get y() {
        return this._view.y;
    }
    set y(value) {
        this._view.y = value;
    }

    get prevPoint() {
        return this.#prevPoint;
    }

    #canSeeTarget() {
        if (this.#target.isDead) {
            return false;
        }

        const targetInWater = this.#target.y > 650;
        if (targetInWater) {
            return false;
        }

        const horizontalDistance = Math.abs(this.x - this.#target.x);
        const verticalDistance = this.#target.y - this.y;

        return horizontalDistance < 420 && verticalDistance < 110 && verticalDistance > -90;
    }

    update() {

        if(!this.isActive){
            if(Math.abs(this.x - this.#target.x) < 720){
                this.isActive = true;
            }
            return;
        }

        this.#prevPoint.x = this.x;
        this.#prevPoint.y = this.y;
        const targetInWater = this.#target.y > 650;
        const canSeeTarget = this.#canSeeTarget();
        const heroIsShooting = this.#target.isMoving && Math.abs(this.#target.x - this.x) < 280 && this.#target.x > this.x - 30 && this.#target.x < this.x + 30;

        if (this.#target.isDead || targetInWater) {
            this.#movement.x = -1;
        }
        else if (heroIsShooting && this.#state == States.Stay && this.#jumpTimer > 30) {
            this.jump();
            this.#jumpTimer = 0;
            this.#movement.x = this.x > this.#target.x ? 1 : -1;
        }
        else if (!this.#target.isMoving) {
            if (this.#movement.x == 0) {
                this.#movement.x = -1;
            }
        }
        else if (!canSeeTarget) {
            this.#movement.x = this.#movement.x || -1;
        }
        else if (this.x > this.#target.x + 48) {
            this.#movement.x = -1;
        }
        else if (this.x < this.#target.x - 48) {
            this.#movement.x = 1;
        }
        else {
            this.#movement.x = 0;
        }

        this.#velocityX = this.#movement.x * this.#SPEED;
        this.x += this.#velocityX;

        this.#jumpTimer++;
        const shouldJumpAtHero = canSeeTarget && !targetInWater && this.#target.isMoving && !heroIsShooting;
        if (shouldJumpAtHero && this.#state == States.Stay && this.#jumpTimer > 90 && Math.random() < this.jumpBehaviorKoef) {
            this.jump();
            this.#jumpTimer = 0;
        }

        if (this.#velocityY > 0) {
            if (!(this.#state == States.Jump || this.#state == States.FlyDown)) {
                if(Math.random() > this.jumpBehaviorKoef){
                    this._view.showFall();
                }
                else if (shouldJumpAtHero){
                    this.jump();
                }
            }
            if (this.#velocityY > 0) {
                this.#state = States.FlyDown;
            }
        }

        this.#velocityY += this.#GRAVITY_FORCE;
        this.y += this.#velocityY;

        this.setView({
            arrowLeft: this.#movement.x == -1,
            arrowRight: this.#movement.x == 1,
        });
    }

    damage(){
        // Guards against a piercing laser bullet overlapping the hitbox for
        // more than one frame and triggering a second death animation.
        if (this.#isDying) {
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
        }
    }

    stay(platformY) {

        if (this.#state == States.Jump || this.#state == States.FlyDown) {
            const fakeButtonContext = {};
            fakeButtonContext.arrowLeft = this.#movement.x == -1;
            fakeButtonContext.arrowRight = this.#movement.x == 1;
            this.#state = States.Stay;
            this.setView(fakeButtonContext);
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

    setView(buttonContext) {

        this._view.flip(this.#movement.x);

        if (this.isJumpState() || this.#state == States.FlyDown) {
            return;
        }

        if (buttonContext.arrowLeft || buttonContext.arrowRight) {
            this._view.showRun();
        }
    }

    removeFromParent(){
        if (this._view.parent != null) {
            this._view.removeFromParent();
        }
    }
}