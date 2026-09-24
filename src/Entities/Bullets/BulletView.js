import { Container, Graphics } from "../../../lib/pixi.mjs";

export default class BulletView extends Container{

    #collisionBox = {
        x:0,
        y:0,
        width:0,
        height:0,
    }

    #centered = false;

    constructor(){
        super();

        this.#collisionBox.width = 5;
        this.#collisionBox.height = 5;
    }

    // Bigger projectiles (fireball) get a hitbox of their own size,
    // centered on the bullet's position.
    setHitSize(width, height){
        this.#collisionBox.width = width;
        this.#collisionBox.height = height;
        this.#centered = true;
    }

    get collisionBox(){
        const dx = this.#centered ? this.#collisionBox.width / 2 : 0;
        const dy = this.#centered ? this.#collisionBox.height / 2 : 0;
        this.#collisionBox.x = this.x - dx;
        this.#collisionBox.y = this.y - dy;
        return this.#collisionBox;
    }

    get hitBox() {
        return this.collisionBox;
    }
}