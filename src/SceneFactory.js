export default class SceneFactory{

    #platforms;
    #platformsFactory;
    #enemyFactory;
    #entities;
    #target;
    #powerupFactory;

    #blockSize = 128;
    #bossBlock = 52;
    #waterY = 768;
    #waterSurfaceY = 744;

    // Ground/platform tiers are registered here first (x columns + y + the
    // factory method to build them) and only actually built afterwards, once
    // every tier is known - that lets us work out which blocks are the
    // topmost thing in their column (nothing else stacked above) so we can
    // dress just those with a bush, instead of guessing per call site.
    #tierDefs = [];

    constructor(platforms, entities, platformFactory, enemyFactory, target, powerupFactory){
        this.#platforms = platforms;
        this.#entities = entities;
        this.#platformsFactory = platformFactory;
        this.#enemyFactory = enemyFactory;
        this.#target = target;
        this.#powerupFactory = powerupFactory;
    }

    createScene(){
        this.#createDecoration();
        this.#registerPlatforms();
        this.#registerGround();
        this.#buildRegisteredTiers();
        this.#createWater();
        this.#createBossWall();
        this.#createCliffDecorations();

        this.#createEnemies();
        this.#createPowerups();

        this.#createInteractive();
    }

    // Jungle canopy + dark undergrowth behind the whole stage, so there is
    // never an empty black void anywhere on screen.
    #createDecoration(){
        // Open riverside with sky and mountains first; from block 22 on the
        // jungle wall stands full height, canopy to ground - nothing floats.
        // Canopy tops are still placed per column (they're designed to tile
        // edge-to-edge), but the dark trunk backdrop behind them is one
        // continuous piece spanning the whole run - see createJungleWall's
        // comment for why a per-column rebuild used to show as a seam. The
        // boss column (bossBlock) is excluded from that continuous span
        // since the boss wall's own transparent-cut sprite sits there now.
        // Backdrop+trunks first (so it renders behind), canopy tops after
        // (so each crown sits in front, hiding the trunk tops that poke up
        // underneath it - same layering the old per-column version had).
        this.#platformsFactory.createJungleWall(this.#blockSize * 22, this.#blockSize * (this.#bossBlock - 22));
        for(let i = 22; i <= this.#bossBlock; i++){
            this.#platformsFactory.createJungle(this.#blockSize * i, 0, i === 22);
        }
    }

    // Vines/bushes on exposed dirt cliff faces - drawn after the ground
    // platforms exist so they sit on top of the dirt instead of getting
    // covered by it.
    #createCliffDecorations(){
        // The opening riverbank drops straight to water on its left edge -
        // dress that exposed dirt face with vines and a bush at the base,
        // like the reference shoreline shot.
        this.#platformsFactory.createCliffVines(this.#blockSize * 1, 384, this.#waterY);
    }

    // Jump-through rock tiers. Each tier fills the space below it with rock,
    // so stacked tiers read as one big cliff face. Only registered here -
    // #buildRegisteredTiers() does the actual building once every tier
    // (ground included) is known.
    #registerPlatforms(){
        // Upper tier (canopy level) - runners rush along it.
        this.#registerTier([24,25,26,27,28,29,30,31,32,33,34], 276, this.#platformsFactory.createPlatform);

        // Main tier - the "road" through the stage.
        this.#registerTier([1,2,3,4,5,6,7,8,9,10,11,12,13,14,15, 20,21,22,23,24,25, 34,35,36, 45,46,47,48], 384, this.#platformsFactory.createPlatform);

        // Lower ledges.
        this.#registerTier([5,6,7, 13,14, 31,32, 49], 492, this.#platformsFactory.createPlatform);

        this.#registerTier([46,47,48], 578, this.#platformsFactory.createPlatform);

        this.#registerTier([8, 11, 28,29,30], 600, this.#platformsFactory.createPlatform);

        this.#registerTier([50], 624, this.#platformsFactory.createPlatform);
    }

    // Solid ground and rock walls. Only registered here, same as above.
    #registerGround(){
        // Riverbank steps you can climb out of the water onto.
        this.#registerTier([9,10, 25,26,27, 32,33,34], 720, this.#platformsFactory.createStepBox);

        // Rock staircase climbing towards the fortress.
        this.#registerTier([36,37, 39,40], 600, this.#platformsFactory.createBox);

        this.#registerTier([42,43], 492, this.#platformsFactory.createBox);

        // Final approach to the boss wall.
        this.#registerTier([35, 45,46,47,48,49,50,51,52], 720, this.#platformsFactory.createBox);
    }

    #registerTier(xIndexes, y, createFunc){
        this.#tierDefs.push({xIndexes, y, createFunc});
    }

    // Builds every registered platform/ground tier. Any block that turns out
    // to be the topmost thing in its column - nothing else registered
    // higher up (smaller y) at that same x - counts as "exposed". Once every
    // tier is built, contiguous runs of exposed columns sharing the same y
    // get dressed with a single unbroken bush strip each, so open-top blocks
    // don't read as bare while covered/stacked ones (a ledge sitting under
    // another tier) stay clean, and a run of several open blocks reads as
    // one continuous treeline instead of separate per-block clumps.
    #buildRegisteredTiers(){
        const topmostY = new Map();
        for (const {xIndexes, y} of this.#tierDefs){
            for (const i of xIndexes){
                if (!topmostY.has(i) || y < topmostY.get(i)){
                    topmostY.set(i, y);
                }
            }
        }

        // Every y a column has a tier at (for the edge dressing below).
        const columnYs = new Map();
        for (const {xIndexes, y} of this.#tierDefs){
            for (const i of xIndexes){
                if (!columnYs.has(i)){
                    columnYs.set(i, []);
                }
                columnYs.get(i).push(y);
            }
        }

        // Built from the highest tier down, so every lower tier is drawn in
        // front of the higher ones behind it (it is closer to the camera),
        // and each tier's edges are dressed right after it - before the
        // tiers in front of it cover them.
        const levels = [...new Set(this.#tierDefs.map(def => def.y))].sort((a, b) => a - b);
        for (const level of levels){
            const columns = new Set();
            for (const {xIndexes, y, createFunc} of this.#tierDefs){
                if (y !== level){
                    continue;
                }
                for (const i of xIndexes){
                    const x = this.#blockSize * i;
                    this.#platforms.push(createFunc.call(this.#platformsFactory, x, y));
                    columns.add(i);
                }
            }
            this.#dressTierEdges(level, columns, columnYs);
        }

        this.#buildWaterlineBushes(columnYs);

        // Trees before bushes so the bush strip's foliage sits in front of
        // each tree's base (like undergrowth actually growing up around a
        // trunk) instead of the trunk base cutting flat across the bushes.
        this.#buildTrees(topmostY);
        this.#buildBushStrips(topmostY);
    }

    // Standalone palm trees scattered across exposed ground runs, matching
    // the reference art's layered look: the distant jungle-wall canopy
    // (createJungle) stays where it is, and individual trees stand in front
    // of/around it directly on the walkable grass. Only the two grass tiers
    // people actually run on (the main road and the canopy platforms) get
    // them, spaced every 3rd exposed column so it reads as scattered growth
    // rather than a second identical fence; a tiny x jitter (odd/even column)
    // keeps them from lining up in a perfectly straight row.
    #buildTrees(topmostY){
        const validY = new Set([384, 276]);
        const indexes = [...topmostY.keys()].sort((a, b) => a - b);

        for (const i of indexes){
            const y = topmostY.get(i);
            if (!validY.has(y) || i % 3 !== 1){
                continue;
            }
            const jitter = i % 2 === 0 ? 18 : -14;
            const x = this.#blockSize * i + this.#blockSize / 2 + jitter;
            this.#platformsFactory.createPalmTree(x, y);
        }
    }

    // Groups exposed columns into contiguous runs (consecutive x-indices
    // sharing the same topmost y) and drops one bush strip per run, sized to
    // the run's exact pixel width so it never overflows past its ends.
    #buildBushStrips(topmostY){
        const indexes = [...topmostY.keys()].sort((a, b) => a - b);

        let runStart = null;
        let runEnd = null;
        let runY = null;

        const flush = () => {
            if (runStart === null){
                return;
            }
            const xStart = this.#blockSize * runStart;
            const widthPixels = this.#blockSize * (runEnd - runStart + 1);
            this.#platformsFactory.createBushStrip(xStart, widthPixels, runY);
        };

        for (const i of indexes){
            const y = topmostY.get(i);

            if (runStart !== null && i === runEnd + 1 && y === runY){
                runEnd = i;
                continue;
            }

            flush();
            runStart = i;
            runEnd = i;
            runY = y;
        }
        flush();
    }

    // Where a run of blocks ends, its cliff side gets a hanging grass/vine
    // drape, and if a higher tier's dirt is behind it, a soft shadow falls
    // on that dirt - so the front block reads as a separate island standing
    // in front of the one behind instead of one flat merged dirt wall.
    #dressTierEdges(y, columns, columnYs){
        const sorted = [...columns].sort((a, b) => a - b);
        for (let k = 0; k < sorted.length; k++){
            const i = sorted[k];
            const isRunStart = !columns.has(i - 1);
            const isRunEnd = !columns.has(i + 1);
            for (const [side, isEdge] of [[-1, isRunStart], [1, isRunEnd]]){
                if (!isEdge || i + side === this.#bossBlock || i === this.#bossBlock){
                    continue;
                }
                const edgeX = this.#blockSize * (side < 0 ? i : i + 1);
                const neighborYs = columnYs.get(i + side) || [];
                if (neighborYs.some(ny => ny < y)){
                    this.#platformsFactory.createTierEdgeShadow(edgeX, y, side, this.#waterSurfaceY);
                }
                this.#platformsFactory.createEdgeVine(edgeX, y, side);
            }
        }
    }

    // A fringe of shore bushes where every island meets the river, like the
    // leafy bottom edge of the islands in the reference art.
    #buildWaterlineBushes(columnYs){
        for (const i of [...columnYs.keys()].sort((a, b) => a - b)){
            if (i >= this.#bossBlock - 1){
                continue;
            }
            for (let k = 0; k < 2; k++){
                const jitter = ((i * 7 + k * 3) % 5) * 6 - 12;
                this.#platformsFactory.createShoreBush(this.#blockSize * i + k * 64 + jitter, this.#waterSurfaceY);
            }
        }
    }

    #createWater(){
        let xIndexes = [0,1,2,3,4,5,6,7,8, 11,12,13,14,15,16,17,18,19,20,21,22,23,24, 28,29,30,31, 38, 41, 44];
        this.#create(xIndexes, this.#waterY, this.#platformsFactory.createWater);

        // Everywhere else the river still runs in front of the islands'
        // feet: dirt below the water surface (riverbank steps, the bottom of
        // every cliff) is under water, not a dirt pillar standing in the
        // river. Visual only - no collision, the real water platforms above
        // are unchanged.
        const waterColumns = new Set(xIndexes);
        for (let i = 0; i <= this.#bossBlock + 3; i++){
            if (!waterColumns.has(i)){
                this.#platformsFactory.createWaterFill(this.#blockSize * i, this.#waterY);
            }
        }
    }

    #createBossWall(){
        // Wall y=260 pushes the sprite's base solidly into the ground tier
        // (block 52 sits at y=720) instead of just grazing it, so there's no
        // gap between the fortress and the floor. Door+guns are positioned
        // independently via createBoss() below and aren't affected by this.
        this.#create([this.#bossBlock], 260, this.#platformsFactory.createBossWall);
        this.#enemyFactory.createBoss(this.#blockSize * this.#bossBlock, 310);
    }

    #createInteractive(){
        // Bridge over the river - it blows up section by section behind you.
        this.#createBridges([16,17,18,19], 384);
    }

    #createBridges(xIndexes, y){
        for (let i of xIndexes){
            let bridge = this.#platformsFactory.createBridge(this.#blockSize * i, y);
            bridge.setTarget(this.#target);
            this.#platforms.push(bridge);
            this.#entities.push(bridge);
        }
    }

    #create(xIndexes, y, createFunc){
        for (let i of xIndexes){
            this.#platforms.push(createFunc.call(this.#platformsFactory, this.#blockSize * i, y));
        }
    }

    #createEnemies(){
        const b = this.#blockSize;

        // Opening rush along the main tier.
        this.#enemyFactory.createRunner(b * 9, 290);
        this.#enemyFactory.createRunner(b * 10, 290);
        this.#enemyFactory.createRunner(b * 11, 290);

        // Tight pack right before the bridge.
        this.#enemyFactory.createRunner(b * 13, 290);
        this.#enemyFactory.createRunner(b * 13 + 50, 290);
        this.#enemyFactory.createRunner(b * 13 + 100, 290);

        // On the bridge itself.
        this.#enemyFactory.createRunner(b * 16, 290);
        this.#enemyFactory.createRunner(b * 18, 290);

        this.#enemyFactory.createRunner(b * 20, 290);
        this.#enemyFactory.createRunner(b * 21, 290);

        // Canopy tier.
        this.#enemyFactory.createRunner(b * 29, 180);
        this.#enemyFactory.createRunner(b * 30, 180);
        this.#enemyFactory.createRunner(b * 33, 180);

        // Jumpers on the rock staircase.
        let runner = this.#enemyFactory.createRunner(b * 40, 400);
        runner.jumpBehaviorKoef = 1;
        runner = this.#enemyFactory.createRunner(b * 42, 400);
        runner.jumpBehaviorKoef = 1;

        // Last defenders before the wall.
        this.#enemyFactory.createRunner(b * 47, 290);
        this.#enemyFactory.createRunner(b * 49, 290);

        // Riflemen dug in along the route - they stand their ground and shoot.
        this.#enemyFactory.createSniper(b * 8 + 40, 384);            // end of the first tier
        this.#enemyFactory.createSniper(b * 15 + 40, 384, 0x8be07a); // guarding the bridge
        this.#enemyFactory.createSniper(b * 23 + 30, 384);           // before the canopy climb
        this.#enemyFactory.createSniper(b * 27 + 60, 276, 0x8be07a); // canopy tier
        this.#enemyFactory.createSniper(b * 35 + 40, 384);           // past the second river
        this.#enemyFactory.createSniper(b * 37 + 40, 600, 0x8be07a); // rock staircase
        this.#enemyFactory.createSniper(b * 43 + 40, 492);           // top of the staircase
        this.#enemyFactory.createSniper(b * 49 + 40, 492, 0x8be07a); // final approach
        this.#enemyFactory.createSniper(b * 50 + 40, 624);           // right before the boss wall

        // Turrets dug into the rock.
        this.#enemyFactory.createTourelle(b * 10, 670);
        this.#enemyFactory.createTourelle(b * 22 + 50, 500);
        this.#enemyFactory.createTourelle(b * 29 + 64, 550);
        this.#enemyFactory.createTourelle(b * 35 + 64, 550);
        this.#enemyFactory.createTourelle(b * 45 + 64, 670);
        this.#enemyFactory.createTourelle(b * 48 + 64, 670);
    }

    #createPowerups(){
        this.#powerupFactory.createPowerup(this.#blockSize * 5, 150);
        this.#powerupFactory.createPowerup(this.#blockSize * 15, 150);
        this.#powerupFactory.createPowerup(this.#blockSize * 25, 150);
        this.#powerupFactory.createPowerup(this.#blockSize * 44, 150);
    }
}
