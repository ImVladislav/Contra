export default class Weapon{

    #currentGunStrategy;
    #bulletFactory;

    #count = 0;
    #limit = 6;

    #isFire = false;
    #bulletContext;

    constructor(bulletFactory){
        this.#bulletFactory = bulletFactory;

        this.#currentGunStrategy = this.#defaultGunStrategy;
    }

    update(bulletContext){
        if(this.#isFire == false){
            return
        }

        if(this.#count % this.#limit == 0){
            this.#currentGunStrategy(bulletContext);
        }
        this.#count ++;
    }

    setWeapon(type){
        switch(type){
            case 1: 
                this.#currentGunStrategy = this.#defaultGunStrategy;
                break;
            case 2: 
                this.#currentGunStrategy = this.#spreadGunStrategy;
                break;
            case 3:
                this.#currentGunStrategy = this.#machineGunStrategy;
                break;
            case 4:
                this.#currentGunStrategy = this.#flameStrategy;
                break;
            case 5:
                this.#currentGunStrategy = this.#laserStrategy;
                break;
            case 6:
                this.#currentGunStrategy = this.#rapidStrategy;
                break;
        }
    }

    startFire(){
        this.#isFire = true;
    }

    stopFire(){
        this.#isFire = false;
        this.#count = 0;
    }

    #defaultGunStrategy(bulletContext){
        this.#limit = 10;
        this.#bulletFactory.createBullet(bulletContext);
    }

    #spreadGunStrategy(bulletContext){
        this.#limit = 40;
        let angleShift = -20;
        for(let i=0; i<5; i++){
            const localBulletContext = {
                x: bulletContext.x,
                y: bulletContext.y,
                angle: bulletContext.angle + angleShift,
                type: bulletContext.type,
            }

            this.#bulletFactory.createSpreadGunBullet(localBulletContext);
            angleShift += 10;
        }
    }

    // M - automatic stream of tracers with a tiny bit of barrel jitter.
    #machineGunStrategy(bulletContext){
        this.#limit = 5;
        this.#bulletFactory.createMachineGunBullet({
            x: bulletContext.x,
            y: bulletContext.y,
            angle: bulletContext.angle + (Math.random() * 3 - 1.5),
            type: bulletContext.type,
        });
    }

    // F - one big corkscrew fireball at a time, full range.
    #flameStrategy(bulletContext){
        this.#limit = 18;
        this.#bulletFactory.createFlameBullet(bulletContext);
    }

    // L - a fast piercing beam that keeps going after hitting an enemy.
    #laserStrategy(bulletContext){
        this.#limit = 16;
        this.#bulletFactory.createLaserBullet(bulletContext);
    }

    // R - fast glowing pellets: quicker fire rate and much faster bullets
    // than the default gun.
    #rapidStrategy(bulletContext){
        this.#limit = 6;
        this.#bulletFactory.createRapidBullet(bulletContext);
    }
}