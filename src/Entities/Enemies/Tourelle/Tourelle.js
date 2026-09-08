import Entity from "../../Entity.js";

export default class Tourelle extends Entity{

    #target;
    #bulletFactory;
    #timeCounter = 0;
    #health = 5;
    #isDying = false;

    type = "enemy";
    
    constructor(view, target, bulletFactory){
        super(view);

        this.#target = target;
        this.#bulletFactory = bulletFactory;

        this.isActive = false;
    }

    update(){
        if (this.#target.isDead){
            return;
        }

        if(!this.isActive){
            if(Math.abs(this.x - this.#target.x) < 720){
                this.isActive = true;
            }
            return;
        }

        let angle = Math.atan2(this.#target.y - this.y, this.#target.x - this.x);
        this._view.gunRotation = angle;

        this.#fire(angle);
    }

    damage(){
        // Guards against a single piercing laser bullet racking up several
        // hits while it overlaps the hitbox and triggering the death
        // animation more than once.
        if (this.#isDying){
            return;
        }

        this.#health--;

        if (this.#health < 1){
            this.#isDying = true;
            this.#timeCounter = 0;
            const deadAnimation = this._view.showAndGetDeadAnimation();
            deadAnimation.onComplete = () => {
                this.dead();
            }
        }
    }

    #fire(angle){
        this.#timeCounter++;

        if(this.#timeCounter < 50){
            return;
        }

        const bulletContext = {};
        bulletContext.x = this.x;
        bulletContext.y = this.y;
        bulletContext.angle = angle / Math.PI * 180;
        bulletContext.type = "enemyBullet";

        this.#bulletFactory.createBullet(bulletContext);

        this.#timeCounter = 0;
    }
}