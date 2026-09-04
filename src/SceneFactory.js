export default class SceneFactory{

    #platforms;
    #platformsFactory;
    #enemyFactory;
    #entities;
    #target;
    #powerupFactory;

    #blockSize = 128;

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
        this.#createPlatforms();
        this.#createGround();
        this.#createWater();
        this.#createBossWall();

        this.#createEnemies();
        this.#createPowerups();

        this.#createInteractive();
    }

    #createDecoration(){
        for(let i = 16; i < 66; i++){
            this.#platformsFactory.createJungle(this.#blockSize * i, 0);
        }
    }

    #createPlatforms(){
        // Jump puzzle above the first turret wall.
        let xIndexes = [17,18,19];
        this.#create(xIndexes, 384, this.#platformsFactory.createPlatform);

        xIndexes = [18];
        this.#create(xIndexes, 578, this.#platformsFactory.createPlatform);
    }

    #createGround(){
        // Opening clearing.
        let xIndexes = [0,1,2];
        this.#create(xIndexes, 720, this.#platformsFactory.createBox);

        // Turret wall + platform-puzzle ground.
        xIndexes = [9,10, 12,13,14,15,16,17,18,19,20];
        this.#create(xIndexes, 720, this.#platformsFactory.createBox);

        xIndexes = [11];
        this.#create(xIndexes, 600, this.#platformsFactory.createBox);

        // Jagged canyon floor - alternating heights instead of one flat run.
        xIndexes = [21,23,25];
        this.#create(xIndexes, 720, this.#platformsFactory.createBox);
        xIndexes = [22,24,26];
        this.#create(xIndexes, 660, this.#platformsFactory.createBox);

        // Staircase up to the gorge bridge (720 -> 600 -> 492 -> 384).
        xIndexes = [34];
        this.#create(xIndexes, 600, this.#platformsFactory.createBox);
        xIndexes = [35];
        this.#create(xIndexes, 492, this.#platformsFactory.createBox);

        // Staircase back down on the far side. Blocks 36-41 have nothing
        // beneath them at all - only the bridge - it's a real drop if it collapses.
        xIndexes = [42];
        this.#create(xIndexes, 492, this.#platformsFactory.createBox);

        // Second canyon stretch, jagged again, with a raised turret perch at 50.
        xIndexes = [43,45,47,49];
        this.#create(xIndexes, 720, this.#platformsFactory.createBox);
        xIndexes = [44,46,48];
        this.#create(xIndexes, 660, this.#platformsFactory.createBox);
        xIndexes = [50];
        this.#create(xIndexes, 600, this.#platformsFactory.createBox);

        // Staircase up to the second, water-backed bridge.
        xIndexes = [51];
        this.#create(xIndexes, 600, this.#platformsFactory.createBox);
        xIndexes = [52];
        this.#create(xIndexes, 492, this.#platformsFactory.createBox);
        xIndexes = [53];
        this.#create(xIndexes, 384, this.#platformsFactory.createBox);

        // Staircase back down.
        xIndexes = [61];
        this.#create(xIndexes, 492, this.#platformsFactory.createBox);

        // Ground before the final approach, with one raised turret perch.
        xIndexes = [62,64,65];
        this.#create(xIndexes, 720, this.#platformsFactory.createBox);
        xIndexes = [63];
        this.#create(xIndexes, 600, this.#platformsFactory.createBox);

        // Short, clean, obstacle-free run to the boss wall - like the original.
        xIndexes = [66];
        this.#create(xIndexes, 720, this.#platformsFactory.createBox);
    }

    #createWater(){
        // First river (walkable, non-lethal).
        let xIndexes = [3,4,5,6,7,8];
        this.#create(xIndexes, 768, this.#platformsFactory.createWater);

        // Second river.
        xIndexes = [27,28,29,30,31,32,33];
        this.#create(xIndexes, 768, this.#platformsFactory.createWater);

        // Note: blocks 36-41 (the gorge under the first bridge) are
        // intentionally left with no water and no ground - a real pit.

        // Water beneath the second bridge (a forgiving safety net this time).
        xIndexes = [54,55,56,57,58,59,60];
        this.#create(xIndexes, 768, this.#platformsFactory.createWater);
    }

    #createBossWall(){
        let xIndexes = [66];
        this.#create(xIndexes, 170, this.#platformsFactory.createBossWall);

        this.#enemyFactory.createBoss(this.#blockSize * 66, 440);
    }

    #createInteractive(){
        // Bridge #1: over a real gorge - falling here is fatal.
        let xIndexes = [36,37,38,39,40,41];
        this.#createBridges(xIndexes, 384);

        // Bridge #2: over water - falling here just lands you in the river.
        xIndexes = [54,55,56,57,58,59,60];
        this.#createBridges(xIndexes, 384);
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
        // Opening wave - a pair, then a straggler in the river.
        this.#enemyFactory.createRunner(this.#blockSize * 1, 290);
        this.#enemyFactory.createRunner(this.#blockSize * 2, 290);
        this.#enemyFactory.createRunner(this.#blockSize * 5, 290);

        // Turret embedded in the wall at 11.
        this.#enemyFactory.createTourelle(this.#blockSize * 11, 500);

        // Wave near the turret.
        this.#enemyFactory.createRunner(this.#blockSize * 13, 290);
        this.#enemyFactory.createRunner(this.#blockSize * 14, 290);

        // Wave on the platform puzzle.
        this.#enemyFactory.createRunner(this.#blockSize * 19, 290);
        this.#enemyFactory.createRunner(this.#blockSize * 20, 290);

        // Canyon wave, spread out with a turret on the high ledge.
        this.#enemyFactory.createRunner(this.#blockSize * 22, 290);
        this.#enemyFactory.createRunner(this.#blockSize * 23, 290);
        this.#enemyFactory.createTourelle(this.#blockSize * 24, 500);
        this.#enemyFactory.createRunner(this.#blockSize * 25, 290);

        // Turret guarding the far bank of the second river.
        this.#enemyFactory.createTourelle(this.#blockSize * 33, 500);

        let runner = this.#enemyFactory.createRunner(this.#blockSize * 29, 400);
        runner.jumpBehaviorKoef = 1;
        runner = this.#enemyFactory.createRunner(this.#blockSize * 31, 400);
        runner.jumpBehaviorKoef = 1;

        // A runner on the gorge bridge itself - real tension, real fall.
        this.#enemyFactory.createRunner(this.#blockSize * 38, 290);

        // Turret guarding the exit of the gorge crossing.
        this.#enemyFactory.createTourelle(this.#blockSize * 43 + 64, 670);

        // Second canyon wave.
        this.#enemyFactory.createRunner(this.#blockSize * 45, 290);
        this.#enemyFactory.createRunner(this.#blockSize * 46, 290);
        this.#enemyFactory.createTourelle(this.#blockSize * 50, 500);
        this.#enemyFactory.createRunner(this.#blockSize * 48, 290);

        // Jump-runners crossing the second, water-backed bridge.
        runner = this.#enemyFactory.createRunner(this.#blockSize * 56, 400);
        runner.jumpBehaviorKoef = 1;
        runner = this.#enemyFactory.createRunner(this.#blockSize * 58, 400);
        runner.jumpBehaviorKoef = 1;

        // Last wave before the final approach, turret on the high perch.
        this.#enemyFactory.createTourelle(this.#blockSize * 63, 500);
        this.#enemyFactory.createRunner(this.#blockSize * 62, 290);
        this.#enemyFactory.createRunner(this.#blockSize * 64, 290);
        this.#enemyFactory.createRunner(this.#blockSize * 65, 290);
    }

    #createPowerups(){
        this.#powerupFactory.createPowerup(this.#blockSize * 9, 150);
        this.#powerupFactory.createPowerup(this.#blockSize * 17, 150);
        this.#powerupFactory.createPowerup(this.#blockSize * 46, 150);
        this.#powerupFactory.createPowerup(this.#blockSize * 61, 150);
    }
}
