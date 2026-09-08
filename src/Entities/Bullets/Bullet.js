import Entity from "../Entity.js";

export default class Bullet extends Entity{


    #angle;
    #lifeFrames = Infinity;

    speed = 10;
    type;
    // Laser bullets set this so they keep flying through an enemy instead
    // of being destroyed on the first hit (see Game.js #checkDamage).
    piercing = false;

    constructor(view, angle){
        super(view);

        this.#angle = angle * Math.PI / 180;
    }

    get angle(){
        return this.#angle;
    }

    // Used by short-range weapons (flame) so the bullet burns out after a
    // fixed number of frames instead of flying until it leaves the screen.
    setLifeFrames(frames){
        this.#lifeFrames = frames;
    }

    update(){
        this.x += this.speed * Math.cos(this.#angle);
        this.y += this.speed * Math.sin(this.#angle);

        if(this.#lifeFrames != Infinity){
            this.#lifeFrames--;
            if(this.#lifeFrames <= 0){
                this.dead();
            }
        }
    }
}
