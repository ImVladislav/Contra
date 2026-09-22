import { Container, Graphics, Sprite, TilingSprite } from "../../../lib/pixi.mjs";
import BridgePlatform from "./BridgePlatform.js";
import Platform from "./Platform.js";
import PlatformView from "./PlatformView.js";

export default class PlatformFactory{
   
    #platformWidth = 128;
    #platformHeight = 24;

    #worldContainer;
    #assets;

    constructor(worldContainer, assets){
        this.#worldContainer = worldContainer;
        this.#assets = assets;
    }

    createPlatform(x, y) {
        const skin =  this.#getGroundPlatform(x, y);
        const view = new PlatformView(this.#platformWidth, this.#platformHeight);
        view.addChild(skin);

        const platform = new Platform(view);
        platform.x = x;
        platform.y = y;
        this.#worldContainer.background.addChild(view);

        return platform;
    }

    createBox(x, y){
        const skin =  this.#getGroundPlatform(x, y);
        const view = new PlatformView(this.#platformWidth, this.#platformHeight);
        view.addChild(skin);

        const platform = new Platform(view);
        platform.x = x;
        platform.y = y;
        platform.type = "box";
        this.#worldContainer.background.addChild(view);

        return platform;
    }

    createStepBox(x, y){
        const box = this.createBox(x, y);
        box.isStep = true;

        return box;
    }

    createWater(x, y){
        const water = new Sprite(this.#assets.getTexture("water0000"));
        water.x = 0;
        water.y = -this.#platformHeight;
        water.width = this.#platformWidth;
        water.height = 96;

        const view = new PlatformView(this.#platformWidth, this.#platformHeight);
        view.addChild(water);
        view.addChild(this.#createWaterEdgeShading());

        const platform = new Platform(view);
        platform.x = x;
        platform.y = y;
        platform.type = "box";
        platform.isWater = true;
        this.#worldContainer.foreground.addChild(view);

        return platform;
    }

    // Depth cue where solid ground meets the water: a bright rim of light
    // right at the surface, fading into a soft shadow the ground casts onto
    // the water below it. Without this every tier of ground reads as flat
    // and equally "far away" - this line is what sells the ground sitting a
    // block closer to the camera than the open water in front of it, the
    // same way the reference art shades the waterline under each island.
    #createWaterEdgeShading(){
        const shading = new Graphics();
        const top = -this.#platformHeight;

        shading.beginFill(0xe8fbff, 0.5);
        shading.drawRect(0, top, this.#platformWidth, 2);
        shading.endFill();

        const bands = [0.32, 0.24, 0.17, 0.11, 0.06, 0.03];
        let by = top + 2;
        for (const alpha of bands){
            shading.beginFill(0x001019, alpha);
            shading.drawRect(0, by, this.#platformWidth, 3);
            shading.endFill();
            by += 3;
        }

        return shading;
    }

    createBossWall(x, y){
        const skin = new Sprite(this.#assets.getTexture("boss0000"));
        skin.scale.x = 1.5;
        skin.scale.y = 1.5;

        const view = new PlatformView(this.#platformWidth * 3, 768);
        view.addChild(skin);

        const platform = new Platform(view);
        platform.x = x-64;
        platform.y = y-45;
        platform.type = "box";
        this.#worldContainer.background.addChild(view);

        return platform;
    }

    createBridge(x, y){
        const skin = new Sprite(this.#assets.getTexture("bridge0000"));
        const view = new PlatformView(this.#platformWidth, this.#platformHeight);
        view.addChild(skin);

        const platform = new BridgePlatform(view, this.#assets);
        platform.x = x;
        platform.y = y;
        this.#worldContainer.background.addChild(view);

        return platform;
    }

    // groundLevel = the y where the walkable ground tier actually starts
    // (the real level geometry, not an arbitrary depth). The canopy sits
    // once at the top; below it, real tree-trunk sprites (not a flat green
    // fill) run down to groundLevel on a dark jungle-interior background.
    // Bush undergrowth is only placed at the entrance block (isEntrance),
    // sitting right on the ground line - every other wall block stays
    // trunks-only so it never clutters the floating platforms in front of
    // the wall.
    createJungle(x, y, groundLevel = 384, isEntrance = false){
        const wall = new Container();
        wall.x = x;
        wall.y = y;

        const jungleTop = new Sprite(this.#assets.getTexture("jungletop0000"));
        wall.addChild(jungleTop);

        const trunkTop = jungleTop.height - 10;
        const trunkHeight = Math.max(groundLevel - y - trunkTop, 0);
        if (trunkHeight > 0){
            const backdrop = new Graphics();
            backdrop.beginFill(0x081712);
            backdrop.drawRect(0, trunkTop, this.#platformWidth, trunkHeight);
            backdrop.endFill();
            wall.addChild(backdrop);

            const trunkOffsets = [18, 72];
            for (const offsetX of trunkOffsets){
                const trunk = new Sprite(this.#assets.getTexture("trunk0000"));
                trunk.x = offsetX;
                trunk.y = trunkTop;
                trunk.height = trunkHeight;
                wall.addChild(trunk);
            }
        }

        if (isEntrance){
            const bush = new Sprite(this.#assets.getTexture("junglebottom0000"));
            bush.y = groundLevel - y - bush.height * 0.65;
            wall.addChild(bush);
        }

        this.#worldContainer.background.addChild(wall);

        return wall;
    }

    // Decorative vines draping down an exposed dirt cliff face, plus a
    // small bush clump at the waterline - for the left edge of a ground
    // run that drops straight to water (matches the reference art: grass
    // on top, vines clinging to the cliff, bushes at the base).
    createCliffVines(x, groundLevel, waterLevel){
        const vine = new Sprite(this.#assets.getTexture("vine0000"));
        vine.x = x - 6;
        vine.y = groundLevel - 12;
        this.#worldContainer.background.addChild(vine);

        const bush = new Sprite(this.#assets.getTexture("shorebush0000"));
        bush.x = x - 14;
        bush.y = waterLevel - bush.height * 0.85;
        this.#worldContainer.background.addChild(bush);
    }

    // A continuous strip of undergrowth running along the grass of a whole
    // run of adjacent blocks that have nothing stacked above them (no
    // roof/ledge overhead) - breaks up the bare grass line the way
    // undergrowth scatters across the open islands in the reference art.
    // Built as a single TilingSprite spanning the exact pixel width of the
    // run, so it reads as one unbroken monolith with no seams at block
    // boundaries, and is clipped precisely to the run's own width so it
    // never overhangs into a neighbouring (covered) block. Sourced from a
    // long unbroken crop of the reference shoreline treeline, which tiles
    // cleanly since it's cut straight from continuous foliage.
    createBushStrip(xStart, widthPixels, y){
        const texture = this.#assets.getTexture("bushstrip0000");
        const height = texture.height;

        const strip = new TilingSprite(texture, widthPixels, height);
        strip.x = xStart;
        strip.y = y - height + 4;
        this.#worldContainer.background.addChild(strip);
    }

    // Every 3rd block skips the lamp-post detail baked into platform0000,
    // so the ground doesn't look like the exact same block copy-pasted.
    #getGroundPlatform(x = 0, y = 384){
        const blockIndex = Math.round(x / this.#platformWidth);
        const variant = blockIndex % 3 === 2 ? "platform0001" : "platform0000";
        const grass = new Sprite(this.#assets.getTexture(variant));
        const ground = new Sprite(this.#assets.getTexture("ground0000"));
        ground.y = grass.height - 1;
        const ground2 = new Sprite(this.#assets.getTexture("ground0000"));
        ground2.y = grass.height*2 - 2;
        const ground3 = new Sprite(this.#assets.getTexture("ground0000"));
        ground3.y = grass.height*3 - 4;

        grass.addChild(ground);
        grass.addChild(ground2);
        grass.addChild(ground3);

        const tint = this.#getDepthTint(y);
        grass.tint = tint;
        ground.tint = tint;
        ground2.tint = tint;
        ground3.tint = tint;

        return grass;
    }

    // Depth grading: ground down near the water (large y, the closest tier
    // to the camera/foreground) stays full, punchy color; ground up on the
    // high tiers (the canopy platforms, small y) fades slightly toward a
    // cool haze, reading as a step further back - same trick the reference
    // art uses to separate its foreground islands from the hazy background.
    #getDepthTint(y){
        const nearY = 720;
        const farY = 276;
        const t = Math.min(Math.max((y - farY) / (nearY - farY), 0), 1);
        const hazeAmount = (1 - t) * 0.35;
        const haze = { r: 0x3a, g: 0x4a, b: 0x58 };

        const r = Math.round(0xff * (1 - hazeAmount) + haze.r * hazeAmount);
        const g = Math.round(0xff * (1 - hazeAmount) + haze.g * hazeAmount);
        const b = Math.round(0xff * (1 - hazeAmount) + haze.b * hazeAmount);

        return (r << 16) | (g << 8) | b;
    }
}