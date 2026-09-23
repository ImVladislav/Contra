import { AnimatedSprite } from "../../../lib/pixi.mjs";
import Platform from "./Platform.js";

export default class BridgePlatform extends Platform{

    #target;
    #assets;
    #wasReached = false;

    constructor(view, assets){
        super(view);

        this.#assets = assets;
    }

    setTarget(target){
        this.#target = target;
    }

    update(){
        if(this.#target != null){
            // Only starts crumbling once the hero has actually stood on this
            // exact plank (feet at this platform's y). Without this check,
            // if the hero ever ends up past this segment without landing on
            // it - falls through a gap, jumps clean over it - the plain
            // x-distance test doesn't care about height and detonates every
            // remaining section behind at once, making the whole bridge
            // vanish instead of crumbling one plank at a time as you cross.
            if (!this.#wasReached) {
                const feetY = this.#target.collisionBox.y + this.#target.collisionBox.height;
                if (Math.abs(feetY - this.y) < 10) {
                    this.#wasReached = true;
                }
                return;
            }

            if(this.x - this.#target.x < -50 && this.isActive){
                this.isActive = false;
                const deadAnimation = this.#showAndGetDeadAnimation();
                deadAnimation.onComplete = () => {
                    this.dead();
                }
            }
            return;
        }
    }

    #showAndGetDeadAnimation(){
        const explosion = new AnimatedSprite(this.#assets.getAnimationTextures("explosion"));
        explosion.animationSpeed = 1/5;
        explosion.scale.x = 1.5;
        explosion.scale.y = 1.5;
        explosion.x -= 10;
        explosion.loop = false;
        explosion.play();
        this._view.addChild(explosion);

        return explosion;
    }
}