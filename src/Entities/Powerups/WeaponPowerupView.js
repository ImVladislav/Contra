import { Container, Sprite } from "../../../lib/pixi.mjs";

// Generic view for the letter-badge weapon pickups (B/F/L/R/M) that were
// sitting unused in the ROM sprite set - same shape as SpreadgunPowerupView,
// just parameterized by texture so one class covers all of them.
export default class WeaponPowerupView extends Container{

    #collisionBox = {
        x:0,
        y:0,
        width:0,
        height:0,
    }

    constructor(assets, textureName){
        super();

        const view = new Sprite(assets.getTexture(textureName));
        view.scale.set(1.35); // HD badge 48x32 -> ~65px wide
        this.addChild(view);

        this.#collisionBox.width = 50;
        this.#collisionBox.height = 20;
    }

    get collisionBox(){
        this.#collisionBox.x = this.x;
        this.#collisionBox.y = this.y;
        return this.#collisionBox;
    }

    get hitBox(){
        return this.collisionBox;
    }
}
