import Entity from "../Entity.js";

export default class Powerup extends Entity{

    #powerupFactory;
    #flyY;
    #target;

    // Speed relative to the SCREEN, not the world: it crosses the screen at
    // the same calm pace whether the hero is standing or running (the camera
    // scroll is added on top), so it never falls behind the left edge.
    #velocityX = 2;
    #screenX = 0;
    #SCREEN_WIDTH = 1024;
    #bobAmplitude = 50;

    type = "powerupBox";

    constructor(powerupFactory, view, flyY, target){
        super(view);

        this.#powerupFactory = powerupFactory;
        this.#flyY = flyY;
        this.#target = target;

        this.isActive = false;
        this._view.visible = false;
    }

    get collisionBox(){
        return this._view.collisionBox;
    }

    get x(){
        return this._view.x;
    }
    set x(value){
        this._view.x = value;
    }

    get y(){
        return this._view.y;
    }
    set y(value){
        this._view.y = value;
    }

    update(){
        if(!this.isActive){
            if(this.x - this.#target.x < 512 + this.collisionBox.width){
                this.isActive = true;
                this._view.visible = true;
                // Enter from just past the left edge of the screen and fly
                // across it to the right (like the NES capsule), instead of
                // popping into view in the middle.
                this.#screenX = -this.collisionBox.width;
                this.x = this.#screenLeft() + this.#screenX;
            }
            return;
        }

        // Shot down - stays where it exploded.
        if(this.#velocityX == 0){
            return;
        }

        this.#screenX += this.#velocityX;
        this.x = this.#screenLeft() + this.#screenX;
        this.y = this.#flyY + Math.sin(this.#screenX * 0.02) * this.#bobAmplitude;

        // Flew off the right edge without being shot - remove it.
        if(this.#screenX > this.#SCREEN_WIDTH + this.collisionBox.width){
            this.dead();
        }
    }

    // Left edge of the screen in world coordinates (the camera moves the
    // world container, so ask it where screen x=0 is).
    #screenLeft(){
        return this._view.parent ? this._view.parent.toLocal({x: 0, y: 0}).x : this.#target.x - this.#SCREEN_WIDTH / 2;
    }

    damage(){

        if(this.isActive == false){
            return;
        }

        this.#powerupFactory.createRandomWeaponPowerup(this.x, this.y);
        
        this.#velocityX = 0;
        this.#bobAmplitude = 0;
        const deadAnimation = this._view.showAndGetDeadAnimation();
        deadAnimation.onComplete = () => {
            this.dead();
        }
    }
}