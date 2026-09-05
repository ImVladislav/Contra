import { AnimatedSprite, Container, Sprite } from "../../../../lib/pixi.mjs";

// Stationary rifleman. Reuses the hero sprites recoloured (no dedicated art yet)
// and, like the hero, swaps sprite to point the rifle where it fires.
export default class SniperView extends Container{

    #collisionBox = {
        x:0,
        y:0,
        width:20,
        height:90,
    }

    #rootNode;
    #states = {};
    #currentState = "flat";
    #assets;

    // Rifle muzzle offset per pose (unflipped, local coords).
    #gunPoints = {
        flat:     { x: 50, y: 29 },
        up:       { x: 18, y: -30 },
        diagUp:   { x: 40, y: 0 },
        diagDown: { x: 47, y: 50 },
    };

    constructor(assets, tint){
        super();

        this.#assets = assets;

        this.#rootNode = new Container();
        this.#rootNode.pivot.x = 10;
        this.#rootNode.x = 10;
        this.addChild(this.#rootNode);

        const make = (name, dx = 0, dy = 0) => {
            const sprite = new Sprite(assets.getTexture(name));
            sprite.tint = tint;
            sprite.x += dx;
            sprite.y += dy;
            sprite.visible = false;
            this.#rootNode.addChild(sprite);
            return sprite;
        };

        // Same offsets the hero uses for these frames.
        this.#states.flat = make("stay0000");
        this.#states.up = make("stayup0000", 2, -31);
        this.#states.diagUp = make("runup0000", 0, -3);
        this.#states.diagDown = make("rundown0000", 0, -3);

        this.#states.flat.visible = true;
    }

    get isFliped(){
        return this.#rootNode.scale.x == -1;
    }

    get collisionBox(){
        this.#collisionBox.x = this.x;
        this.#collisionBox.y = this.y;
        return this.#collisionBox;
    }

    get hitBox(){
        return this.collisionBox;
    }

    // Where the bullet leaves the rifle, in world coordinates.
    get gunPoint(){
        const dir = this.#rootNode.scale.x;
        const p = this.#gunPoints[this.#currentState];
        return { x: this.x + 10 + dir * (p.x - 10), y: this.y + p.y };
    }

    flip(direction){
        this.#rootNode.scale.x = direction;
    }

    // pose: "flat" | "diagUp" | "diagDown" | "up"
    showAim(pose){
        if (this.#currentState == pose || !this.#states[pose]) {
            return;
        }
        this.#states[this.#currentState].visible = false;
        this.#states[pose].visible = true;
        this.#currentState = pose;
    }

    showAndGetDeadAnimation(){
        this.#rootNode.visible = false;
        this.#collisionBox.width = 0;
        this.#collisionBox.height = 0;

        const explosion = new AnimatedSprite(this.#assets.getAnimationTextures("explosion"));
        explosion.animationSpeed = 1/5;
        explosion.x = -explosion.width/2 + 10;
        explosion.y = 10;
        explosion.loop = false;
        explosion.play();
        this.addChild(explosion);

        return explosion;
    }
}
