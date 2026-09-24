import { Graphics } from "../../../lib/pixi.mjs";
import Bullet from "./Bullet.js";
import BulletView from "./BulletView.js";
import GravitableBullet from "./GravitableBullet.js";

export default class BulletFactory{

    #worldContainer;
    #entities;

    constructor(worldContainer, entities){
        this.#worldContainer = worldContainer;
        this.#entities = entities;
    }

    createBullet(bulletContext){

        const skin = new Graphics();
        skin.beginFill(0xffffff);
        skin.drawRect(0,0,5,5);

        const view = new BulletView();
        view.addChild(skin);

        this.#worldContainer.addChild(view);

        const bullet = new Bullet(view, bulletContext.angle);
        bullet.x = bulletContext.x;
        bullet.y = bulletContext.y;
        bullet.type = bulletContext.type;
        bullet.speed = 10;

        this.#entities.push(bullet);
    }

    createSpreadGunBullet(bulletContext){

        const skin = new Graphics();
        skin.beginFill(0xff2222);
        skin.drawCircle(0,0,6);
        skin.beginFill(0xdddddd);
        skin.drawCircle(-3,-3, 3);

        const view = new BulletView();
        view.addChild(skin);

        this.#worldContainer.addChild(view);

        const bullet = new Bullet(view, bulletContext.angle);
        bullet.x = bulletContext.x;
        bullet.y = bulletContext.y;
        bullet.type = bulletContext.type;
        bullet.speed = 7;


        this.#entities.push(bullet);
    }

    createBossBullet(bulletContext){
        const skin = new Graphics();
        skin.beginFill(0xff2222);
        skin.drawCircle(0,0,6);
        skin.beginFill(0xdddddd);
        skin.drawCircle(-3,-3, 3);

        const view = new BulletView();
        view.addChild(skin);

        this.#worldContainer.addChild(view);

        const bullet = new Bullet(view, bulletContext.angle);
        bullet.x = bulletContext.x;
        bullet.y = bulletContext.y;
        bullet.type = bulletContext.type;
        bullet.speed = 7;

        this.#entities.push(bullet);
    }

    // M - machine gun tracer: an elongated yellow-orange slug rotated along
    // its flight line, fast, in a continuous stream.
    createMachineGunBullet(bulletContext){
        const skin = new Graphics();
        skin.beginFill(0xff8a1e, 0.6);
        skin.drawRect(-2, -3, 16, 6);
        skin.beginFill(0xffe066);
        skin.drawRect(0, -2, 14, 4);
        skin.beginFill(0xffffff);
        skin.drawRect(8, -1, 6, 2);

        const view = new BulletView();
        view.rotation = bulletContext.angle * Math.PI / 180;
        view.addChild(skin);

        this.#worldContainer.addChild(view);

        const bullet = new Bullet(view, bulletContext.angle);
        bullet.x = bulletContext.x;
        bullet.y = bulletContext.y;
        bullet.type = bulletContext.type;
        bullet.speed = 12;

        this.#entities.push(bullet);
    }

    // R - rapid: small hot-white pellet with a cyan glow that flies much
    // faster than the default bullet.
    createRapidBullet(bulletContext){
        const skin = new Graphics();
        skin.beginFill(0x49d6ff, 0.35);
        skin.drawCircle(2, 2, 6);
        skin.beginFill(0xbff3ff);
        skin.drawCircle(2, 2, 3.5);
        skin.beginFill(0xffffff);
        skin.drawCircle(2, 2, 2);

        const view = new BulletView();
        view.addChild(skin);

        this.#worldContainer.addChild(view);

        const bullet = new Bullet(view, bulletContext.angle);
        bullet.x = bulletContext.x;
        bullet.y = bulletContext.y;
        bullet.type = bulletContext.type;
        bullet.speed = 16;

        this.#entities.push(bullet);
    }

    // F - fireball that corkscrews along the firing line all the way across
    // the screen (it used to burn out after ~80px, which felt broken).
    createFlameBullet(bulletContext){
        const skin = new Graphics();
        skin.beginFill(0xff3b0f, 0.55);
        skin.drawCircle(0, 0, 11);
        skin.beginFill(0xff8c1a);
        skin.drawCircle(0, 0, 8);
        skin.beginFill(0xffd84a);
        skin.drawCircle(0, 0, 5);
        skin.beginFill(0xffffff);
        skin.drawCircle(-1, -1, 2);

        const view = new BulletView();
        view.setHitSize(18, 18);
        view.addChild(skin);

        this.#worldContainer.addChild(view);

        const bullet = new Bullet(view, bulletContext.angle);
        bullet.x = bulletContext.x;
        bullet.y = bulletContext.y;
        bullet.type = bulletContext.type;
        bullet.speed = 7;
        bullet.spiral = {radius: 16, step: 0.3};

        this.#entities.push(bullet);
    }

    // L - fast, thin, piercing beam. Rotated to match its firing angle and
    // flagged piercing so it keeps flying through enemies (see Game.js).
    createLaserBullet(bulletContext){
        const skin = new Graphics();
        skin.beginFill(0x39c8ff, 0.45);
        skin.drawRect(0, -5, 44, 10);
        skin.beginFill(0xe8fbff);
        skin.drawRect(0, -2, 44, 4);

        const view = new BulletView();
        view.rotation = bulletContext.angle * Math.PI / 180;
        view.addChild(skin);

        this.#worldContainer.addChild(view);

        const bullet = new Bullet(view, bulletContext.angle);
        bullet.x = bulletContext.x;
        bullet.y = bulletContext.y;
        bullet.type = bulletContext.type;
        bullet.speed = 17;
        bullet.piercing = true;

        this.#entities.push(bullet);
    }
}