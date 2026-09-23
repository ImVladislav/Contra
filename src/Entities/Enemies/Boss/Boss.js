import Entity from "../../Entity.js";

export default class Boss extends Entity{

    #health = 12;
    #hitCooldown = 0;
    #wall;

    type = "enemy";
    isBoss = true;

    // wall is the boss's own PlatformFactory.createBossWall() platform - an
    // optional back-reference just so hits can scar it up (see
    // #updateWallDamage below); the boss doesn't otherwise need to know
    // about it.
    constructor(view, wall){
        super(view);

        this.isActive = true;
        this.#wall = wall;
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
        this.#updateWallDamage();

        if(this.#health < 1){
            this.isActive = false;

            const deadAnimation = this._view.showAndGetDeadAnimation();
            deadAnimation.onComplete = () => {
                this._view.showAdditionalExplosions();
                deadAnimation.removeFromParent();
            }
        }
    }

    // 12 max health, 3 decal stages - one more scar every 4 hits.
    #updateWallDamage(){
        if(!this.#wall || !this.#wall.showDamage){
            return;
        }
        const stage = this.#health <= 2 ? 3 : this.#health <= 6 ? 2 : this.#health <= 10 ? 1 : 0;
        this.#wall.showDamage(stage);
    }
}