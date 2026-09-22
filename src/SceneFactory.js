export default class SceneFactory{

    #platforms;
    #platformsFactory;
    #enemyFactory;
    #entities;
    #target;
    #powerupFactory;

    #blockSize = 128;
    #bossBlock = 52;

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
        for(let i = 22; i <= this.#bossBlock; i++){
            this.#platformsFactory.createJungle(this.#blockSize * i, 0, 384, i === 22);
        }
    }

    // Vines/bushes on exposed dirt cliff faces - drawn after the ground
    // platforms exist so they sit on top of the dirt instead of getting
    // covered by it.
    #createCliffDecorations(){
        // The opening riverbank drops straight to water on its left edge -
        // dress that exposed dirt face with vines and a bush at the base,
        // like the reference shoreline shot.
        this.#platformsFactory.createCliffVines(this.#blockSize * 1, 384, 768);
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

        for (const {xIndexes, y, createFunc} of this.#tierDefs){
            for (const i of xIndexes){
                const x = this.#blockSize * i;
                this.#platforms.push(createFunc.call(this.#platformsFactory, x, y));
            }
        }

        this.#buildBushStrips(topmostY);
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

    #createWater(){
        let xIndexes = [0,1,2,3,4,5,6,7,8, 11,12,13,14,15,16,17,18,19,20,21,22,23,24, 28,29,30,31, 38, 41, 44];
        this.#create(xIndexes, 768, this.#platformsFactory.createWater);
    }

    #createBossWall(){
        this.#create([this.#bossBlock], 170, this.#platformsFactory.createBossWall);
        this.#enemyFactory.createBoss(this.#blockSize * this.#bossBlock, 440);
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
