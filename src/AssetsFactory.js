import { Assets } from "../lib/pixi.mjs";

export default class AssetsFactory{

    #manifest;

    constructor(){
        this.#manifest = Assets.cache.get("./assets/sprites/manifest.json");
    }

    getTexture(textureName){
        return Assets.cache.get(`./assets/sprites/${textureName}.png`);
    }

    getAnimationTextures(animationName){
        return this.#manifest.animations[animationName].map((name) => this.getTexture(name));
    }
}
