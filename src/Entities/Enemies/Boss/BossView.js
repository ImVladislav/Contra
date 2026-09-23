import { AnimatedSprite, Container } from "../../../../lib/pixi.mjs";

export default class BossView extends Container{

    #collisionBox = {
        x:0,
        y:0,
        width:0,
        height:0,
    }

    #view;
    #assets;

    constructor(assets){
        super();

        this.#assets = assets;

        const view = new AnimatedSprite(assets.getAnimationTextures("bossdoor"));
        view.animationSpeed = 1/10;
        view.scale.x = 1.6;
        view.scale.y = 1.6;
        view.play();

        this.addChild(view);
        this.#view = view;

        this.#collisionBox.width = 73;
        this.#collisionBox.height = 94;

    }

    get collisionBox(){
        this.#collisionBox.x = this.x;
        this.#collisionBox.y = this.y;
        return this.#collisionBox;
    }

    get hitBox(){
        return this.collisionBox;
    }

    showHitReaction(x, y){
        this.#view.tint = 0xff8888;
        window.setTimeout(() => {
            this.#view.tint = 0xffffff;
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