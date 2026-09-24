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
            const star = this.#createStar(assets);
            star.x = Math.random() * screenSize.width;
            star.y = Math.random() * 300;
        }

        // Mountain ridge tiled edge to edge (128 wide, so it lines up with
        // the block grid and repeats without a seam), 60% of the window's
        // height and bottom-anchored to the floor of the window (not the
        // top) - this whole layer sits behind the World (ground, water,
        // treeline, everything), so it only ever shows through wherever the
        // playable level doesn't cover it. Drawn first so the tree line and
        // ground sit in front of it.
        const ridgeWidth = 127;
        const ridgeHeight = screenSize.height * 0.5;
        const ridgeTop = screenSize.height - ridgeHeight;
        for(let x = -ridgeWidth; x < screenSize.width + ridgeWidth; x += ridgeWidth){
            this.#createMounts(assets, x, ridgeTop, ridgeHeight);
        }

        // Distant tree line with its own water reflection, bottom-aligned to
        // the real water line (y = 744) so it reads as a hazy far shore seen
        // across the water, low down - behind the dirt cliffs, only peeking
        // through over open water or gaps in the ground.
        const treeWidth = 128;
        const treeHeight = 145;
        const treeTop = 744 - 64 - treeHeight; // water surface on screen (world is shifted up 64px)
        for(let x = -treeWidth; x < screenSize.width + treeWidth; x += treeWidth){
            this.#createTreeline(assets, x, treeTop);
        }
    }

    // 10 star textures (star0000-0009) cut from the HD pack's starfield
    // (Stage6-Space-1.png): tiny dots with a soft glow, from dim to bright.
    #createStar(assets){
        const index = Math.floor(Math.random() * 10);
        const star = new Sprite(assets.getTexture("star000" + index));
        star.scale.x = 2;
        star.scale.y = 2;
        this.addChild(star);

        return star;
    }

    #createMounts(assets, x, y, height){
        const mounts = new Sprite(assets.getTexture("mounts0000"));
        mounts.x = x;
        mounts.y = y;
        if (height){
            mounts.height = height;
        }
        this.addChild(mounts);

        return mounts;
    }

    #createTreeline(assets, x, y){
        const treeline = new Sprite(assets.getTexture("treeline0000"));
        treeline.x = x;
        treeline.y = y;
        this.addChild(treeline);

        return treeline;
    }
}
