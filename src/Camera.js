export default class Camera {

    #target;
    #world;
    #isBackScrollX;
    #centerScreenPointX;
    #rightBorderWorldPointX;
    #lastTargetX = 0;
    #worldWidth;

    constructor(cameraSettings){
        this.#target = cameraSettings.target;
        this.#world = cameraSettings.world;
        this.#isBackScrollX = cameraSettings.isBackScrollX;

        this.#worldWidth = this.#world.width;
        this.#centerScreenPointX = cameraSettings.screenSize.width / 2;
        this.#rightBorderWorldPointX = this.#worldWidth - this.#centerScreenPointX;
    }

    // The view was resized (phone rotated / browser window changed): re-centre.
    resize(screenWidth){
        this.#centerScreenPointX = screenWidth / 2;
        this.#rightBorderWorldPointX = this.#worldWidth - this.#centerScreenPointX;
        const x = Math.min(Math.max(this.#target.x, this.#centerScreenPointX), this.#rightBorderWorldPointX);
        this.#world.x = this.#centerScreenPointX - x;
        this.#lastTargetX = x;
    }

    update(){
        if(this.#target.x > this.#centerScreenPointX 
            && this.#target.x < this.#rightBorderWorldPointX
            && (this.#isBackScrollX || this.#target.x > this.#lastTargetX)){
            this.#world.x = this.#centerScreenPointX - this.#target.x;
            this.#lastTargetX = this.#target.x;
        }
    }
}