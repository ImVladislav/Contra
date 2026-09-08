import Powerup from "./Powerup.js";
import PowerupView from "./PowerupView.js";
import SpreadgunPowerup from "./SpreadgunPowerup.js";
import SpreadgunPowerupView from "./SpreadgunPowerupView.js";
import WeaponPowerup from "./WeaponPowerup.js";
import WeaponPowerupView from "./WeaponPowerupView.js";

// Every drop the shot-down supply crate can hand out. Weapon.setWeapon()
// type numbers: 2 = spread (already existed), 3-6 are new. "barrier" is not
// a gun at all - Game.js grants a temporary shield instead of swapping guns.
const WEAPON_DROPS = [
    { weaponType: 3, texture: "sprite_34" }, // M - machine gun
    { weaponType: 4, texture: "sprite_31" }, // F - flame
    { weaponType: 5, texture: "sprite_32" }, // L - laser
    { weaponType: 6, texture: "sprite_33" }, // R - rapid fire
    { weaponType: "barrier", texture: "sprite_30" }, // B - temporary shield
];

export default class PowerupsFactory{

    #entities;
    #assets;
    #worldContainer;
    #target;

    constructor(entities, assets, worldContainer, target){
        this.#entities = entities;
        this.#assets = assets;
        this.#worldContainer = worldContainer;
        this.#target = target;
    }

    createPowerup(x, y){
        const view = new PowerupView(this.#assets);

        const powerup = new Powerup(this, view, y, this.#target);

        view.x = x;

        this.#worldContainer.addChild(view);
        this.#entities.push(powerup);
    }

    createSpreadGunPowerup(x, y){
        const view = new SpreadgunPowerupView(this.#assets);
        const powerup = new SpreadgunPowerup(view);

        powerup.x = x;
        powerup.y = y;

        this.#worldContainer.addChild(view);
        this.#entities.push(powerup);
    }

    createWeaponPowerup(x, y, weaponType, textureName){
        const view = new WeaponPowerupView(this.#assets, textureName);
        const powerup = new WeaponPowerup(view, weaponType);

        powerup.x = x;
        powerup.y = y;

        this.#worldContainer.addChild(view);
        this.#entities.push(powerup);
    }

    // What the crate hands out is random - the classic Spreadgun plus the
    // five badges (M/F/L/R/B) that used to sit unused in the sprite sheet.
    createRandomWeaponPowerup(x, y){
        if(Math.random() < 1 / (WEAPON_DROPS.length + 1)){
            this.createSpreadGunPowerup(x, y);
            return;
        }

        const drop = WEAPON_DROPS[Math.floor(Math.random() * WEAPON_DROPS.length)];
        this.createWeaponPowerup(x, y, drop.weaponType, drop.texture);
    }
}