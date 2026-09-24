import { AnimatedSprite, Container, Rectangle, Sprite, Texture } from "../../../../lib/pixi.mjs";

export default class BossView extends Container{

    #collisionBox = {
        x:0,
        y:0,
        width:0,
        height:0,
    }

    #view;
    #assets;
    #damage;
    #destructTextures;
    #damageFlash;

    constructor(assets){
        super();

        this.#assets = assets;

        const view = new AnimatedSprite(assets.getAnimationTextures("bossdoor"));
        view.animationSpeed = 1/10;
        view.scale.x = 1.8; // same scale as the wall art
        view.scale.y = 2.4;
        view.play();

        this.addChild(view);
        this.#view = view;

        this.#collisionBox.width = 86; // 48px * 1.8
        this.#collisionBox.height = 130; // 54px * 2.4

        // Damage overlay. bossdestruct frames are cut from the wall art at its
        // native size, so the overlay uses the wall's scale (1.8 x 2.4).
        // Frame 0 = intact, 1-4 = the door taking hits, 5-8 = the wall
        // blowing open on death. EnemiesFactory adds it to the scene.
        this.#destructTextures = assets.getAnimationTextures("bossdestruct");
        const damage = new AnimatedSprite(this.#destructTextures);
        damage.scale.x = 1.8;
        damage.scale.y = 2.4;
        damage.loop = false;
        damage.animationSpeed = 1/8;
        damage.visible = false;
        this.#damage = damage;

        // Red hit flash for the damaged door: a copy of just the door area
        // plate (48x54 at 5,26 in the frame) laid over the overlay, so only the
        // door blinks, not the whole wall piece the overlay covers.
        const damageFlash = new Sprite();
        damageFlash.x = 5;
        damageFlash.y = 26;
        damageFlash.tint = 0xff8888;
        damageFlash.visible = false;
        damage.addChild(damageFlash);
        this.#damageFlash = damageFlash;

    }

    get collisionBox(){
        this.#collisionBox.x = this.x;
        this.#collisionBox.y = this.y;
        return this.#collisionBox;
    }

    get hitBox(){
        return this.collisionBox;
    }

    get damageView(){
        return this.#damage;
    }

    // stage 0 = intact door, 1..4 = more and more damaged door.
    showDamage(stage){
        if(stage < 1){
            return;
        }
        this.#view.visible = false;
        this.#damage.visible = true;
        this.#damage.gotoAndStop(Math.min(stage, 4));
    }

    showHitReaction(x, y){
        this.#view.tint = 0xff8888;
        if(this.#damage.visible){
            const frame = this.#damage.texture;
            this.#damageFlash.texture = new Texture(frame.baseTexture,
                new Rectangle(frame.frame.x + 5, frame.frame.y + 26, 48, 54));
            this.#damageFlash.visible = true;
        }
        window.setTimeout(() => {
            this.#view.tint = 0xffffff;
            this.#damageFlash.visible = false;
        }, 80);

        const spark = new AnimatedSprite(this.#assets.getAnimationTextures("explosion"));
        spark.animationSpeed = 1/4;
        spark.scale.x = 0.5;
        spark.scale.y = 0.5;
        spark.loop = false;
        spark.play();
        spark.x = x - spark.width/2;
        spark.y = y - spark.height/2;
        this.addChild(spark);
        spark.onComplete = () => spark.removeFromParent();
    }

    showAndGetDeadAnimation(){
        this.#view.visible = false;
        this.#damageFlash.visible = false;

        // Wall blows open (frames 4-8) and stays on the last frame.
        this.#damage.visible = true;
        this.#damage.textures = this.#destructTextures.slice(4, 9);
        this.#damage.play();
        this.#collisionBox.width = 0;
        this.#collisionBox.height = 0;

        const explosion1 = this.#createExplosion();
        const explosion2 = this.#createExplosion();
        explosion2.y = -explosion1.height;

        return explosion1;
    }

    showAdditionalExplosions(){
        const explosion1 = this.#createExplosion();
        const explosion2 = this.#createExplosion();
        const explosion3 = this.#createExplosion();
        const explosion4 = this.#createExplosion();

        explosion1.x = 30;

        explosion2.x = 120;
        explosion2.y = 60;

        explosion3.x = 200;

        explosion4.x = -40;
        explosion4.y = 40;
    }

    #createExplosion(){
        const explosion = new AnimatedSprite(this.#assets.getAnimationTextures("explosion"));
        explosion.animationSpeed = 1/5;
        explosion.scale.x = 2;
        explosion.scale.y = 2;
        explosion.loop = false;
        explosion.play();
        this.addChild(explosion);

        explosion.onComplete = () => {
            explosion.removeFromParent();
        }

        return explosion;
    }
}