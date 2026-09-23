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

    // Damage decals (a burnt/cracked hole cutout) sit on top of the intact
    // wall picture itself - three fixed spots that fade in one at a time as
    // the boss takes hits, instead of ever swapping the base wall image for
    // a different one (that "pile of broken textures" look was already
    // rejected once - this stays purely additive on the single static skin).
    #bossDamageSpots = [
        {x: 190, y: 55, scale: 0.42, rotation: 0},
        {x: 245, y: 175, scale: 0.5, rotation: 2.6},
        {x: 260, y: 460, scale: 0.55, rotation: 1.1},
    ];

    createBossWall(x, y){
        const skin = new Sprite(this.#assets.getTexture("boss0000"));
        skin.scale.x = 1.5;
        skin.scale.y = 1.5;

        const view = new PlatformView(this.#platformWidth * 3, 768);
        view.addChild(skin);

        const damageSprites = this.#bossDamageSpots.map(spot => {
            const decal = new Sprite(this.#assets.getTexture("bossdamage0000"));
            decal.anchor.set(0.5);
            decal.x = spot.x;
            decal.y = spot.y;
            decal.rotation = spot.rotation;
            decal.scale.set(spot.scale);
            decal.alpha = 0;
            view.addChild(decal);
            return decal;
        });

        const platform = new Platform(view);
        platform.x = x-64;
        platform.y = y-45;
        platform.type = "box";
        this.#worldContainer.background.addChild(view);

        // stage 0 = pristine, 1..3 = that many scorch/crack decals visible.
        // Called from the boss as its health drops, so the wall visibly
        // scars up over the fight instead of only the hit-spark flashing.
        platform.showDamage = (stage) => {
            damageSprites.forEach((decal, i) => {
                decal.alpha = i < stage ? 0.95 : 0;
            });
        };

        return platform;
    }

    // Deck texture is a small repeating grated-road tile (cropped from the
    // reference bridge art) tiled edge-to-edge across the full segment
    // width via TilingSprite, so it reads as one continuous walkway instead
    // of a single stretched/squashed image per segment.
    createBridge(x, y){
        const texture = this.#assets.getTexture("bridge0000");
        const skin = new TilingSprite(texture, this.#platformWidth, texture.height);
        const view = new PlatformView(this.#platformWidth, this.#platformHeight);
        view.addChild(skin);

        const platform = new BridgePlatform(view, this.#assets);
        platform.x = x;
        platform.y = y;
        this.#worldContainer.background.addChild(view);

        return platform;
    }

    // The canopy top for one column - both jungletop0000/0001 are alpha-cut
    // (transparent sky, not a baked-in black rectangle), so unlike the old
    // opaque version they can freely overlap or gap without leaving a solid
    // colour block behind them. Alternating between the two variants with a
    // small per-column jitter makes each tree read as its own individual
    // specimen planted in a row, instead of one flat tile stamped
    // identically every 128px. Bush undergrowth is only placed at the
    // entrance block (isEntrance), sitting right on the ground line.
    createJungle(x, y, isEntrance = false){
        const wall = new Container();
        wall.x = x;
        wall.y = y;

        const hash = Math.abs(Math.sin(x * 78.233) * 12543.123);
        const frac = hash - Math.floor(hash);
        const variant = frac < 0.5 ? "jungletop0000" : "jungletop0001";
        const jungleTop = new Sprite(this.#assets.getTexture(variant));
        jungleTop.x = Math.round((frac - 0.5) * 26);
        wall.addChild(jungleTop);

        if (isEntrance){
            const bush = new Sprite(this.#assets.getTexture("junglebottom0000"));
            bush.y = 384 - y - bush.height * 0.65;
            wall.addChild(bush);
        }

        this.#worldContainer.background.addChild(wall);

        return wall;
    }

    // The dark jungle-interior backdrop + tree trunks behind a whole run of
    // wall columns, drawn as ONE continuous shape spanning widthPixels
    // instead of being rebuilt per 128px column - that per-column rebuild is
    // what showed up as a hard repeating seam (each column's rectangle edge
    // lining up with the next). Trunks are scattered at an organic,
    // non-128px-aligned spacing so the run doesn't read as a picket fence
    // either. groundLevel = the y where the walkable ground tier starts.
    createJungleWall(xStart, widthPixels, groundLevel = 384){
        const wall = new Container();
        wall.x = xStart;
        wall.y = 0;

        const jungleTopHeight = this.#assets.getTexture("jungletop0000").height;
        const trunkTop = jungleTopHeight - 10;
        const trunkHeight = Math.max(groundLevel - trunkTop, 0);
        if (trunkHeight <= 0){
            return wall;
        }

        // Vertical gradient - lighter jungle-green right under the canopy,
        // fading to near-black at the ground - reads as a deep interior
        // instead of a painted cardboard backdrop, and being one shape for
        // the whole run means there's no seam between columns.
        const backdrop = new Graphics();
        const bands = 6;
        for (let b = 0; b < bands; b++){
            const t = b / (bands - 1);
            const shade = Math.round(0x17 * (1 - t) + 0x02 * t);
            const color = (0x08 << 16) | (Math.round(0x1a * (1 - t) + 0x08 * t) << 8) | shade;
            backdrop.beginFill(color);
            backdrop.drawRect(0, trunkTop + (trunkHeight * b) / bands, widthPixels, trunkHeight / bands + 1);
            backdrop.endFill();
        }
        wall.addChild(backdrop);

        // trunk0000 is a small (9px wide) native bark swatch - scaled up 3x
        // and repeated vertically via TilingSprite instead of stretching a
        // single image over trunkHeight, which used to blur into a smeared
        // mess on tall runs. tileScale keeps the bark crisp at every height.
        const trunkTexture = this.#assets.getTexture("trunk0000");
        const trunkScale = 3;
        const trunkWidth = trunkTexture.width * trunkScale;
        let x = 14;
        while (x < widthPixels - 14){
            const trunk = new TilingSprite(trunkTexture, trunkWidth, trunkHeight);
            trunk.tileScale.set(trunkScale, trunkScale);
            trunk.x = x;
            trunk.y = trunkTop;
            wall.addChild(trunk);

            // Deterministic pseudo-random gap (46-76px) instead of a fixed
            // 128/2 stride, so trunks never line up into a repeating grid.
            const hash = Math.abs(Math.sin((xStart + x) * 12.9898) * 43758.5453);
            const frac = hash - Math.floor(hash);
            x += 46 + Math.round(frac * 30);
        }

        this.#worldContainer.background.addChild(wall);

        return wall;
    }

    // A single standalone palm tree, bottom-anchored on a walkable ground
    // tier - the foreground/midground specimens that stand directly on the
    // grass in the reference art, layered in front of the distant jungle
    // wall canopy instead of being part of it.
    createPalmTree(x, groundLevel){
        const tree = new Sprite(this.#assets.getTexture("palmtree0000"));
        tree.x = x - tree.width / 2;
        tree.y = groundLevel - tree.height + 4;
        this.#worldContainer.background.addChild(tree);

        return tree;
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