import Entity from "../Entity.js";

export default class Bullet extends Entity{


    #angle;
    #lifeFrames = Infinity;

    speed = 10;
    type;
    // Laser bullets set this so they keep flying through an enemy instead
    // of being destroyed on the first hit (see Game.js #checkDamage).
    piercing = false;
    // Flame fireballs set this: the bullet circles around a point that
    // travels along the firing line (NES-style corkscrew fireball).
    // { radius, step } - step is radians per frame.
    spiral = null;
    #spiralCenter = null;
    #spiralPhase = 0;

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
        if(this.spiral){
            if(!this.#spiralCenter){
                this.#spiralCenter = {x: this.x, y: this.y};
            }
            this.#spiralCenter.x += this.speed * Math.cos(this.#angle);
            this.#spiralCenter.y += this.speed * Math.sin(this.#angle);
            this.#spiralPhase += this.spiral.step;
            // Start the circle at the gun muzzle (phase 0 = on the line).
            const r = this.spiral.radius;
            this.x = this.#spiralCenter.x + r * Math.cos(this.#spiralPhase) - r;
            this.y = this.#spiralCenter.y + r * Math.sin(this.#spiralPhase);
        }
        else{
            this.x += this.speed * Math.cos(this.#angle);
            this.y += this.speed * Math.sin(this.#angle);
        }

        if(this.#lifeFrames != Infinity){
            this.#lifeFrames--;
            if(this.#lifeFrames <= 0){
                this.dead();
            }
        }
    }
}
