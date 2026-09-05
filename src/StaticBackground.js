import { Container, Graphics, Sprite } from "../lib/pixi.mjs";

export default class StaticBackground extends Container{
    constructor(screenSize, assets){
        super();

        // Plain black night sky - the mountain sprites have an opaque black
        // background, so anything else shows seams around them.
        const sky = new Graphics();
        sky.beginFill(0x000000);
        sky.drawRect(0, 0, screenSize.width, screenSize.height);
        sky.endFill();
        this.addChild(sky);

        for(let i=0; i<220; i++){
            const star = this.#createStar();
            star.x = Math.random() * screenSize.width;
            star.y = Math.random() * 300;
        }

        // Mountain ridge tiled edge to edge; its base lines up with the top
        // of the main rock tier (y = 384) so the peaks sit on the ground.
        const ridgeScale = 1.4;
        const ridgeWidth = 140 * ridgeScale;
        const ridgeHeight = 89 * ridgeScale;
        for(let x = -ridgeWidth / 2; x < screenSize.width + ridgeWidth; x += ridgeWidth){
            this.#createMounts(assets, x, 384 - ridgeHeight + 2, ridgeScale);
        }
    }

    #createStar(){
        const star = new Graphics();
        star.beginFill(0xdddddd);
        star.drawRect(0,0,2,2);
        this.addChild(star);

        return star;
    }

    #createMounts(assets, x, y, scale){
        const mounts = new Sprite(assets.getTexture("mounts0000"));
        mounts.scale.x = scale;
        mounts.scale.y = scale;
        mounts.x = x;
        mounts.y = y;
        this.addChild(mounts);

        return mounts;
    }
}
