import Entity from "../../Entity.js";

// Stands still, tracks the hero, points the rifle at him (flat, 45 degrees
// up/down or straight up - the same four poses the hero has) and fires
// along that line every so often.
export default class Sniper extends Entity{

    #target;
    #bulletFactory;
    #timeCounter = 0;
    #health = 1;
    #isDying = false;
    #aimAngle = 0;

    #activationDistance = 600;
    #fireDelay = 75; // frames between shots

    type = "enemy";

    constructor(view, target, bulletFactory){
        super(view);

        this.#target = target;
        this.#bulletFactory = bulletFactory;

        this.isActive = false;
        this.gravitable = false;
    }

    update(){
        if (this.#isDying || this.#target.isDead){
            return;
        }

        const dx = (this.#target.x + 10) - (this.x + 10);
        const dy = (this.#target.y + 40) - (this.y + 30);

        if(!this.isActive){
            if(Math.abs(dx) < this.#activationDistance){
                this.isActive = true;
                this.#timeCounter = Math.floor(this.#fireDelay / 2);
            }
            return;
        }

        this.#aim(dx, dy);

        this.#timeCounter++;
        if (this.#timeCounter > this.#fireDelay) {
            this.#fire();
            this.#timeCounter = 0;
        }
    }

    // Pick the pose closest to the hero's direction, like the hero's own
    // aim states, and remember the exact firing angle for that pose.
    #aim(dx, dy){
        const dir = dx < 0 ? -1 : 1;
        this._view.flip(dir);

        const horizontal = Math.abs(dx);
        const vertical = -dy; // positive = hero is above

        let pose;
        if (vertical > horizontal * 2.4) {
            pose = "up";
        }
        else if (vertical > horizontal * 0.42) {
            pose = "diagUp";
        }
        else if (vertical < -horizontal * 0.42) {
            pose = "diagDown";
        }
        else {
            pose = "flat";
        }

        this._view.showAim(pose);

        const poseAngles = { flat: 0, diagUp: -45, diagDown: 45, up: -90 };
        const local = poseAngles[pose];
        // Mirror for a left-facing shooter (angle measured from +x axis).
        this.#aimAngle = dir == 1 ? local : (180 - local);
    }

    damage(){
        if (this.#isDying) {
            return;
        }
        this.#health--;

        if (this.#health < 1){
            this.#isDying = true;
            const deadAnimation = this._view.showAndGetDeadAnimation();
            deadAnimation.onComplete = () => {
                this.dead();
            }
        }
    }

    #fire(){
        const gunPoint = this._view.gunPoint;

        const bulletContext = {};
        bulletContext.x = gunPoint.x;
        bulletContext.y = gunPoint.y;
        bulletContext.angle = this.#aimAngle;
        bulletContext.type = "enemyBullet";

        this.#bulletFactory.createBullet(bulletContext);
    }
}
