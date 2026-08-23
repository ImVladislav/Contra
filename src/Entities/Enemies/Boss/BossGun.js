import Entity from "../../Entity.js";

export default class BossGun extends Entity{

    #target;
    #bulletFactory;
    #timeCounter = 0;
    #reloadDelay = 180;
    #health = 5;

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

        this.#fire();
    }

    damage(){
        this.#health--;

        if (this.#health < 1){
            this.#timeCounter = 0;
            const deadAnimation = this._view.showAndGetDeadAnimation();
            deadAnimation.onComplete = () => {
                this.dead();
            }
        }
    }

    #fire(){
        this.#timeCounter++;

        if (this.#timeCounter < this.#reloadDelay) {
            return;
        }

        const dx = this.#target.x - this.x;
        const dy = this.#target.y - this.y;
        const angle = Math.atan2(dy, dx) * 180 / Math.PI;

        const bulletContext = {};
        bulletContext.x = this.x;
        bulletContext.y = this.y;
        bulletContext.angle = angle;
        bulletContext.type = "enemyBullet";

        this.#bulletFactory.createBossBullet(bulletContext);

        this.#timeCounter = 0;
    }
}