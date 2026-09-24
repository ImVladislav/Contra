import Entity from "../Entity.js";

export default class SpreadgunPowerup extends Entity{

    // Pops up out of the shot capsule, drifts forward a little, floats
    // down (capped fall speed) and bounces once when it lands.
    #GRAVITY_FORCE = 0.25;
    #MAX_FALL_SPEED = 5;
    #velocityX = 2.5;
    #velocityY = -7;
    #hasBounced = false;

    type = "spreadgunPowerup";
    powerupType = 2;

    #prevPoint = {
        x:0,
        y:0,
    }

    constructor(view){
        super(view);

        this.gravitable = true;
    }

    get prevPoint(){
        return this.#prevPoint;
    }

    update(){
        this.#prevPoint.x = this.x;
        this.#prevPoint.y = this.y;

        this.#velocityX -= 0.04;
        if(this.#velocityX < 0){
            this.#velocityX = 0;
        }
        this.x += this.#velocityX;

        this.#velocityY = Math.min(this.#velocityY + this.#GRAVITY_FORCE, this.#MAX_FALL_SPEED);
        this.y += this.#velocityY;
    }

    stay(platformY){
        this.y = platformY - this._view.collisionBox.height;

        // One small bounce on the first landing, then it stays put.
        if(!this.#hasBounced && this.#velocityY > 2){
            this.#hasBounced = true;
            this.#velocityY = -3;
            return;
        }

        this.#velocityX = 0;
        this.#velocityY = 0;
    }

    isJumpState(){
        return false;
    }
    
    damage(){
        this.dead();
    }
}