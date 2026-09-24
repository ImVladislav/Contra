import RunnerView from "./Runner/RunnerView.js";
import TourelleView from "./Tourelle/TourelleView.js";
import Runner from "./Runner/Runner.js";
import Tourelle from "./Tourelle/Tourelle.js";
import BossView from "./Boss/BossView.js";
import Boss from "./Boss/Boss.js";
import BossGunView from "./Boss/BossGunView.js";
import BossGun from "./Boss/BossGun.js";
import SniperView from "./Sniper/SniperView.js";
import Sniper from "./Sniper/Sniper.js";

export default class EnemiesFactory{
    #worldContainer;
    #target;
    #bulletFactory;
    #entities;
    #assets;

    constructor(worldContainer, target, bulletFactory, entities, assets){
        this.#worldContainer = worldContainer;
        this.#target = target;
        this.#bulletFactory = bulletFactory;
        this.#entities = entities;
        this.#assets = assets;
    }

    createRunner(x, y){
        const view = new RunnerView(this.#assets);
        this.#worldContainer.addChild(view);

        const runner = new Runner(view, this.#target);
        runner.x = x;
        runner.y = y;

        this.#entities.push(runner);

        return runner;
    }

    createTourelle(x, y){
        const view = new TourelleView(this.#assets);
        this.#worldContainer.addChild(view);

        const tourelle = new Tourelle(view, this.#target, this.#bulletFactory);
        tourelle.x = x;
        tourelle.y = y;

        this.#entities.push(tourelle);

        return tourelle;
    }

    // Stationary rifleman standing on a platform whose top is at `platformY`.
    // Recoloured hero sprite: red = regular, green = "veteran" (same stats,
    // just visual variety) - swap in dedicated art later if you get some.
    createSniper(x, platformY, tint = 0xff7b6b){
        const view = new SniperView(this.#assets, tint);
        this.#worldContainer.addChild(view);

        const sniper = new Sniper(view, this.#target, this.#bulletFactory);
        sniper.x = x;
        sniper.y = platformY - 90;

        this.#entities.push(sniper);

        return sniper;
    }

    createBoss(x, y){
        const view = new BossView(this.#assets);
        this.#worldContainer.addChild(view);

        const boss = new Boss(view);
        boss.x = x - 42.4;
        boss.y = y + 207.6;

        // Damage overlay sits at the bottom of the game layer: over the wall
        // art, under the hero and bullets. Offset lines its door up with ours.
        this.#worldContainer.addChildAt(view.damageView, 0);
        view.damageView.x = boss.x - 5 * 1.8;
        view.damageView.y = boss.y - 26 * 2.4;

        this.#entities.push(boss);

        const gun1 = this.#createBossGun();
        gun1.x = x - 56;
        gun1.y = y;

        const gun2 = this.#createBossGun();
        gun2.x = x + 34;
        gun2.y = y;

        return boss;
    }
    
    #createBossGun(){
        const gunView = new BossGunView(this.#assets);
        this.#worldContainer.addChild(gunView);
        const bossGun = new BossGun(gunView, this.#target, this.#bulletFactory);
        this.#entities.push(bossGun);
        return bossGun;
    }
}