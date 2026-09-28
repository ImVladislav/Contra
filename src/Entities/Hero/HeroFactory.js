import Hero from "./Hero.js?v=9";
import HeroView from "./HeroView.js";

export default class HeroFactory{
    #worldContainer;
    #assets;

    constructor(worldContainer, assets){
        this.#worldContainer = worldContainer;
        this.#assets = assets;
    }

    create(x, y){
        const heroView = new HeroView(this.#assets);
        this.#worldContainer.addChild(heroView);

        const hero = new Hero(heroView);
        hero.x = x;
        hero.y = y;

        return hero;
    }
}