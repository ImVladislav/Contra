// Follows the hero. On a PC the whole 768px-tall level band is on screen
// and the camera only scrolls sideways; on a phone the world is zoomed in
// (settings.zoom) and the camera also follows the hero up and down, smoothly,
// never showing anything above the sky line or below the river bottom.
export default class Camera {

    #target;
    #world;
    #isBackScrollX;
    #zoom;
    #screenWidth;
    #screenHeight;
    #worldWidth;
    #topLimit;
    #bottomLimit;
    #lastTargetX = 0;
    #viewTop;

    constructor(cameraSettings){
        this.#target = cameraSettings.target;
        this.#world = cameraSettings.world;
        this.#isBackScrollX = cameraSettings.isBackScrollX;
        this.#zoom = cameraSettings.zoom ?? 1;
        this.#topLimit = cameraSettings.topLimit ?? 64;
        this.#bottomLimit = cameraSettings.bottomLimit ?? 832;
        this.#screenWidth = cameraSettings.screenSize.width;
        this.#screenHeight = cameraSettings.screenSize.height;

        this.#world.scale.set(this.#zoom);
        this.#worldWidth = this.#world.width / this.#zoom;
        this.#viewTop = this.#wantedTop();
        this.#world.y = -this.#viewTop * this.#zoom;
    }

    get zoom(){
        return this.#zoom;
    }

    // half the visible width, in world units
    #halfViewWidth(){
        return this.#screenWidth / 2 / this.#zoom;
    }

    // top of the visible part of the level we'd like: hero a bit below the
    // middle of the screen, clamped to the level's top/bottom
    #wantedTop(){
        const viewHeight = this.#screenHeight / this.#zoom;
        const heroMiddle = this.#target.y + 45;
        const top = heroMiddle - viewHeight * 0.55;
        const maxTop = Math.max(this.#topLimit, this.#bottomLimit - viewHeight);
        return Math.min(Math.max(top, this.#topLimit), maxTop);
    }

    // The view was resized (phone rotated / browser window changed): re-centre.
    resize(screenWidth){
        this.#screenWidth = screenWidth;
        const center = this.#halfViewWidth();
        const x = Math.min(Math.max(this.#target.x, center), this.#worldWidth - center);
        this.#world.x = (center - x) * this.#zoom;
        this.#lastTargetX = x;
        this.#viewTop = this.#wantedTop();
        this.#world.y = -this.#viewTop * this.#zoom;
    }

    update(){
        const center = this.#halfViewWidth();
        const rightBorder = this.#worldWidth - center;
        if(this.#target.x > center
            && this.#target.x < rightBorder
            && (this.#isBackScrollX || this.#target.x > this.#lastTargetX)){
            this.#world.x = (center - this.#target.x) * this.#zoom;
            this.#lastTargetX = this.#target.x;
        }

        // vertical: ease towards the hero (no jitter on every jump)
        this.#viewTop += (this.#wantedTop() - this.#viewTop) * 0.1;
        this.#world.y = -this.#viewTop * this.#zoom;
    }
}
