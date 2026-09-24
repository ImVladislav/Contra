import Entity from "../../Entity.js";

export default class Boss extends Entity{

    static MAX_HEALTH = 40;
    #health = Boss.MAX_HEALTH;
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
        this.#updateDoorDamage();
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

    // Door damage frames 1-4: one more stage every MAX_HEALTH/5 hits
    // (40 hp -> every 8 hits).
    #updateDoorDamage(){
        const lost = Boss.MAX_HEALTH - this.#health;
        const stage = Math.min(4, Math.floor(lost / (Boss.MAX_HEALTH / 5)));
        this._view.showDamage(stage);
    }

    // 3 decal stages on the wall.
    #updateWallDamage(){
        if(!this.#wall || !this.#wall.showDamage){
            return;
        }
        const stage = this.#health <= 2 ? 3 : this.#health <= 6 ? 2 : this.#health <= 10 ? 1 : 0;
        this.#wall.showDamage(stage);
    }
}