import { AnimatedSprite, Container, Sprite } from "../../../../lib/pixi.mjs";

// Stationary rifleman - dedicated enemy-red soldier art pulled from the ROM
// set (it used to just be the hero sprites recoloured, then a placeholder
// android). These are the same body tiles as the hero's own running/aiming
// frames, but rendered with the "p2" palette (fully red instead of tan
// skin + blue trousers), so it reads as its own character while keeping
// a familiar soldier silhouette. Still swaps pose to point the rifle
// where it fires, the same way the hero does.
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

    // Rifle muzzle offset per pose (unflipped, local coords), measured off
    // the actual barrel-tip pixel in each source sprite so bullets leave
    // from where the gun is drawn.
    #gunPoints = {
        flat:     { x: 59, y: 15 },
        up:       { x: 27, y: -63 },
        diagUp:   { x: 47, y: -22 },
        diagDown: { x: 49, y: 87 },
    };

    // Every pose shares this scale and a common ground line (GROUND_Y) so
    // switching poses does not make the soldier hop up and down.
    #SCALE = 3.4;
    #GROUND_Y = 90;
    #CENTER_X = 20;

    constructor(assets, tint){
        super();

        this.#assets = assets;

        this.#rootNode = new Container();
        this.#rootNode.pivot.x = 10;
        this.#rootNode.x = 10;
        this.addChild(this.#rootNode);

        const make = (name) => {
            const sprite = new Sprite(assets.getTexture(name));
            sprite.tint = tint;
            sprite.scale.set(this.#SCALE);
            sprite.x = this.#CENTER_X - sprite.width / 2;
            sprite.y = this.#GROUND_Y - sprite.height;
            sprite.visible = false;
            this.#rootNode.addChild(sprite);
            return sprite;
        };

        // Same body/run tiles as the hero, "p2" (all-red) palette: aiming
        // level, straight up, diagonally up and diagonally down.
        this.#states.flat = make("sprite_0e_p2");
        this.#states.up = make("sprite_16_p2");
        this.#states.diagUp = make("sprite_11_p2");
        this.#states.diagDown = make("sprite_14_p2");

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
