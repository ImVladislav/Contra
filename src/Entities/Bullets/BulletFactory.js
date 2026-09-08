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

    // F - short, wide flame puff. Burns out after a handful of frames
    // instead of travelling the full screen, so range stays short.
    createFlameBullet(bulletContext){
        const skin = new Graphics();
        skin.beginFill(0xffb347);
        skin.drawCircle(0, 0, 5);
        skin.beginFill(0xff5522);
        skin.drawCircle(0, 0, 3);

        const view = new BulletView();
        view.addChild(skin);

        this.#worldContainer.addChild(view);

        const bullet = new Bullet(view, bulletContext.angle);
        bullet.x = bulletContext.x;
        bullet.y = bulletContext.y;
        bullet.type = bulletContext.type;
        bullet.speed = 6;
        bullet.setLifeFrames(14);

        this.#entities.push(bullet);
    }

    // L - fast, thin, piercing beam. Rotated to match its firing angle and
    // flagged piercing so it keeps flying through enemies (see Game.js).
    createLaserBullet(bulletContext){
        const skin = new Graphics();
        skin.beginFill(0x39c8ff, 0.45);
        skin.drawRect(0, -4, 28, 8);
        skin.beginFill(0xe8fbff);
        skin.drawRect(0, -2, 28, 4);

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