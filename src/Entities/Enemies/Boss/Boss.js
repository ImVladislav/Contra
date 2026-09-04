import Entity from "../../Entity.js";

export default class Boss extends Entity{

    #health = 12;
    #hitCooldown = 0;

    type = "enemy";
    isBoss = true;

    constructor(view){
        super(view);

        this.isActive = true;
    }

    update(){
        if(this.#hitCooldown > 0){
            this.#hitCooldown--;
        }
    }

    damage(hitX, hitY){
        if(this.#hitCooldown > 0){
            return;
        }
        this.#hitCooldown = 10;

        this.#health--;
        this._view.showHitReaction(hitX - this.x, hitY - this.y);

        if(this.#health < 1){
            this.isActive = false;

            const deadAnimation = this._view.showAndGetDeadAnimation();
            deadAnimation.onComplete = () => {
                this._view.showAdditionalExplosions();
                deadAnimation.removeFromParent();
            }
        }
    }
}