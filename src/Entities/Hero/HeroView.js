import {
  AnimatedSprite,
  Container,
  Graphics,
  Sprite,
} from "../../../lib/pixi.mjs";

export default class HeroView extends Container {
  #bounds = {
    width: 0,
    height: 0,
  };
  #collisionBox = {
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  };
  #hitBox = {
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    shiftX: 0,
    shiftY: 0,
  };
  #stm = {
    currentState: "default",
    states: {},
  };

  #bulletPointShift = {
    x: 0,
    y: 0,
  };

  #swimAnimTime = 0;
  #wake;
  #bubbles = [];
  #submergeBody;
  #splash;
  #diveTransition = {
    active: false,
    progress: 0,
    duration: 20,
  };

  #rootNode;
  #assets;

  constructor(assets) {
    super();

    this.#assets = assets;

    this.#createNodeStructure();

    this.#rootNode.pivot.x = 10;
    this.#rootNode.x = 10;
    this.#bounds.width = 20;
    this.#bounds.height = 90;
    this.#collisionBox.width = this.#bounds.width;
    this.#collisionBox.height = this.#bounds.height;

    this.#stm.states.stay = this.#getStayImage();
    this.#stm.states.stayUp = this.#getStayUpImage();
    this.#stm.states.run = this.#getRunImage();
    this.#stm.states.runShoot = this.#getRunShootImage();
    this.#stm.states.runUp = this.#getRunUpImage();
    this.#stm.states.runDown = this.#getRunDownImage();
    this.#stm.states.lay = this.#getLayImage();
    this.#stm.states.jump = this.#getJumpImage();
    this.#stm.states.fall = this.#getFallImage();
    this.#stm.states.swim = this.#getSwimImage();
    this.#stm.states.dive = this.#getDiveImage();

    for (let key in this.#stm.states) {
      this.#rootNode.addChild(this.#stm.states[key]);
    }
  }

  get collisionBox() {
    this.#collisionBox.x = this.x;
    this.#collisionBox.y = this.y;
    return this.#collisionBox;
  }

  get hitBox() {
    this.#hitBox.x = this.x + this.#hitBox.shiftX;
    this.#hitBox.y = this.y + this.#hitBox.shiftY;
    return this.#hitBox;
  }

  get isFliped() {
    return this.#rootNode.scale.x == -1;
  }

  get bulletPointShift() {
    return this.#bulletPointShift;
  }

  reset() {
    this.alpha = 1;
    this.#rootNode.visible = true;
    this.#collisionBox.width = this.#bounds.width;
    this.#collisionBox.height = this.#bounds.height;
    this.#diveTransition.active = false;
    if (this.#submergeBody) {
      this.#submergeBody.visible = false;
    }
  }

  update() {
    if (this.#stm.currentState == "swim" || this.#stm.currentState == "dive") {
      this.#swimAnimTime += 0.12;
      this.#stm.states[this.#stm.currentState].y =
        Math.sin(this.#swimAnimTime) * 3;
    }

    if (this.#stm.currentState == "swim") {
      this.#drawWake();
    }

    if (this.#stm.currentState == "dive") {
      if (this.#diveTransition.active) {
        this.#updateSubmerge();
      }
      this.#drawBubbles();
    }
  }

  setBlinking(isBlinking) {
    this.alpha = isBlinking ? 0.35 : 1;
  }

  showAndGetDeadAnimation() {
    this.#rootNode.visible = false;
    this.#collisionBox.width = 0;
    this.#collisionBox.height = 0;

    const explosion = new AnimatedSprite(
      this.#assets.getAnimationTextures("explosion"),
    );
    explosion.animationSpeed = 1 / 5;
    explosion.x = -explosion.width / 2;
    explosion.loop = false;
    explosion.play();
    this.addChild(explosion);

    return explosion;
  }

  showStay() {
    this.#toState("stay");
    this.#setBulletPointShift(100, 20);

    this.#hitBox.width = 20;
    this.#hitBox.height = 90;
    this.#hitBox.shiftX = 0;
    this.#hitBox.shiftY = 0;
  }

  showStayUp() {
    this.#toState("stayUp");
    this.#setBulletPointShift(18, -30);

    this.#hitBox.width = 20;
    this.#hitBox.height = 90;
    this.#hitBox.shiftX = 0;
    this.#hitBox.shiftY = 0;
  }

  showRun() {
    this.#toState("run");
    this.#setBulletPointShift(65, 30);

    this.#hitBox.width = 20;
    this.#hitBox.height = 90;
    this.#hitBox.shiftX = 0;
    this.#hitBox.shiftY = 0;
  }

  showRunShoot() {
    this.#toState("runShoot");
    this.#setBulletPointShift(100, 20);

    this.#hitBox.width = 20;
    this.#hitBox.height = 90;
    this.#hitBox.shiftX = 0;
    this.#hitBox.shiftY = 0;
  }

  showRunUp() {
    this.#toState("runUp");
    this.#setBulletPointShift(50, 10);

    this.#hitBox.width = 20;
    this.#hitBox.height = 90;
    this.#hitBox.shiftX = 0;
    this.#hitBox.shiftY = 0;
  }

  showRunDown() {
    this.#toState("runDown");
    this.#setBulletPointShift(47, 50);

    this.#hitBox.width = 20;
    this.#hitBox.height = 90;
    this.#hitBox.shiftX = 0;
    this.#hitBox.shiftY = 0;
  }

  showLay() {
    this.#toState("lay");
    this.#setBulletPointShift(75, 78);

    this.#hitBox.width = 90;
    this.#hitBox.height = 20;
    this.#hitBox.shiftX = -45;
    this.#hitBox.shiftY = 70;
  }

  showJump() {
    this.#toState("jump");
    this.#setBulletPointShift(-2, 40);

    this.#hitBox.width = 40;
    this.#hitBox.height = 40;
    this.#hitBox.shiftX = -10;
    this.#hitBox.shiftY = 25;
  }

  showFall() {
    this.#toState("fall");

    this.#hitBox.width = 20;
    this.#hitBox.height = 90;
    this.#hitBox.shiftX = 0;
    this.#hitBox.shiftY = 0;
  }

  showSwim() {
    this.#toState("swim");
    this.#setBulletPointShift(55, 65);

    this.#hitBox.width = 40;
    this.#hitBox.height = 30;
    this.#hitBox.shiftX = -5;
    this.#hitBox.shiftY = 55;
  }

  showDive() {
    const wasAlreadyDiving = this.#stm.currentState == "dive";
    this.#toState("dive");
    if (!wasAlreadyDiving) {
      this.#startSubmerge();
    }
    this.#setBulletPointShift(35, 75);

    this.#hitBox.width = 34;
    this.#hitBox.height = 26;
    this.#hitBox.shiftX = -3;
    this.#hitBox.shiftY = 58;
  }

  flip(direction) {
    switch (direction) {
      case 1:
      case -1:
        this.#rootNode.scale.x = direction;
    }
  }

  #toState(key) {
    if (this.#stm.currentState == key) {
      return;
    }
    for (let key in this.#stm.states) {
      this.#stm.states[key].visible = false;
    }
    this.#stm.states[key].visible = true;
    this.#stm.currentState = key;
  }

  #createNodeStructure() {
    const rootNode = new Container();
    this.addChild(rootNode);
    this.#rootNode = rootNode;
  }

  #setBulletPointShift(x, y) {
    this.#bulletPointShift.x =
      (x + this.#rootNode.pivot.x * this.#rootNode.scale.x) *
      this.#rootNode.scale.x;
    this.#bulletPointShift.y = y;
  }

  #getStayImage() {
    const view = new Sprite(this.#assets.getTexture("stay0000"));
    return view;
  }

  #getStayUpImage() {
    const view = new Sprite(this.#assets.getTexture("stayup0000"));
    view.x += 2;
    view.y -= 31;
    return view;
  }

  #getRunImage() {
    const view = new AnimatedSprite(this.#assets.getAnimationTextures("run"));
    view.animationSpeed = 1 / 10;
    view.play();
    view.y -= 3;
    return view;
  }

  #getRunShootImage() {
    const container = new Container();

    const upperPart = new Sprite(this.#assets.getTexture("stay0000"));
    upperPart.x = 8;
    upperPart.y = 2;

    const upperPartMask = new Graphics();
    upperPartMask.beginFill(0xffffff);
    upperPartMask.drawRect(0, 0, 100, 45);

    upperPart.mask = upperPartMask;

    const bottomPart = new AnimatedSprite(
      this.#assets.getAnimationTextures("run"),
    );
    bottomPart.animationSpeed = 1 / 10;
    bottomPart.play();
    bottomPart.y -= 3;

    const bottomPartMask = new Graphics();
    bottomPartMask.beginFill(0xffffff);
    bottomPartMask.drawRect(0, 45, 100, 45);

    bottomPart.mask = bottomPartMask;

    container.addChild(upperPart);
    container.addChild(bottomPart);
    container.addChild(upperPartMask);
    container.addChild(bottomPartMask);

    return container;
  }

  #getRunUpImage() {
    const view = new AnimatedSprite(this.#assets.getAnimationTextures("runup"));
    view.animationSpeed = 1 / 10;
    view.play();
    view.y -= 3;
    return view;
  }

  #getRunDownImage() {
    const view = new AnimatedSprite(
      this.#assets.getAnimationTextures("rundown"),
    );
    view.animationSpeed = 1 / 10;
    view.play();
    view.y -= 3;
    return view;
  }

  #getLayImage() {
    const view = new Sprite(this.#assets.getTexture("lay0000"));
    view.scale.set(1.5, 1.5);
    view.x -= 46;
    view.y -= 38;
    return view;
  }

  #getJumpImage() {
    const view = new AnimatedSprite(this.#assets.getAnimationTextures("jump"));
    view.animationSpeed = 1 / 10;
    view.play();
    view.y -= 3;
    view.x -= 10;
    return view;
  }

  #getFallImage() {
    const view = new Sprite(this.#assets.getTexture("run0003"));
    return view;
  }

  // Swim: the real hero sprite, sunk so only head and shoulders show
  // above the water tiles (water renders on the foreground layer).
  #getSwimImage() {
    const container = new Container();

    const body = new Sprite(this.#assets.getTexture("stay0000"));
    body.y = 38;

    this.#wake = new Graphics();

    container.addChild(body, this.#wake);
    return container;
  }

  // Ripples trailing behind the swimmer: a gently undulating waterline plus
  // expanding ring ripples, instead of a single rigid straight bar.
  #drawWake() {
    const wake = this.#wake;
    wake.clear();

    const waterLineY = 58;
    const centerX = 20; // roughly the swimmer's torso, not the sprite's left edge

    wake.lineStyle(1.5, 0xd9f2ff, 0.5);
    wake.moveTo(centerX - 24, waterLineY);
    for (let x = centerX - 24; x <= centerX + 24; x += 3) {
      const y =
        waterLineY + Math.sin(this.#swimAnimTime * 2.2 + x * 0.35) * 1.4;
      wake.lineTo(x, y);
    }

    for (let i = 0; i < 3; i++) {
      const cycle = 2.2;
      const phase = (this.#swimAnimTime * 0.9 + i * (cycle / 3)) % cycle;
      const t = phase / cycle; // 0..1
      const radiusX = 6 + t * 22;
      const radiusY = radiusX * 0.32;

      wake.lineStyle(1.2, 0xe8f8ff, 0.5 * (1 - t));
      wake.drawEllipse(centerX, waterLineY, radiusX, radiusY);
    }
  }

  // Dive: hero sinks below the surface (animated), then only bubbles give away the position.
  #getDiveImage() {
    const container = new Container();

    const submergeBody = new Sprite(this.#assets.getTexture("stay0000"));
    submergeBody.y = 38;
    submergeBody.visible = false;
    this.#submergeBody = submergeBody;

    this.#splash = new Graphics();

    this.#bubbles = [
      { baseX: 20, baseY: 50, r: 3, alpha: 0.75, speed: 0.6, phase: 0 },
      { baseX: 10, baseY: 42, r: 2, alpha: 0.5, speed: 0.8, phase: 1.5 },
      { baseX: 28, baseY: 40, r: 2, alpha: 0.6, speed: 0.7, phase: 3 },
    ].map((bubble) => ({ ...bubble, gfx: new Graphics() }));

    container.addChild(submergeBody, this.#splash);
    this.#bubbles.forEach((bubble) => container.addChild(bubble.gfx));
    return container;
  }

  // Kicks off the sink-under-the-surface animation when diving begins.
  #startSubmerge() {
    this.#diveTransition.active = true;
    this.#diveTransition.progress = 0;
    this.#submergeBody.visible = true;
    this.#submergeBody.alpha = 1;
    this.#submergeBody.y = 38;
    this.#splash.clear();
  }

  // Advances the submerge animation: the body just sinks (no fade - the
  // opaque water tile on the foreground layer naturally covers it once it
  // passes the waterline, ~66 in this local space) while a splash ring
  // expands at the surface, then hands off to the bubbles.
  #updateSubmerge() {
    const transition = this.#diveTransition;
    transition.progress += 1 / transition.duration;
    const p = Math.min(transition.progress, 1);
    const sinkT = p * p; // accelerate downward, like gravity pulling under

    this.#submergeBody.y = 38 + sinkT * 50;

    this.#splash.clear();
    if (p < 1) {
      const radiusX = 8 + p * 24;
      const radiusY = radiusX * 0.3;
      this.#splash.lineStyle(2, 0xe8f8ff, 0.6 * (1 - p));
      this.#splash.drawEllipse(20, 40, radiusX, radiusY);
    }

    if (p >= 1) {
      transition.active = false;
      this.#submergeBody.visible = false;
      this.#splash.clear();
    }
  }

  // Bubbles rise from their spawn point, wobble sideways and fade as they surface.
  #drawBubbles() {
    const t = this.#swimAnimTime;

    for (const bubble of this.#bubbles) {
      const rise = (t * 6 * bubble.speed + bubble.phase * 10) % 24;
      const fade = 1 - rise / 24;
      const x = bubble.baseX + Math.sin(t * 2 + bubble.phase) * 1.5;
      const y = bubble.baseY - rise;

      bubble.gfx.clear();
      bubble.gfx.beginFill(0xbfe6ff, bubble.alpha * fade);
      bubble.gfx.drawCircle(x, y, bubble.r);
      bubble.gfx.endFill();
    }
  }

  // Recolours every sprite of the hero (used for the second character).
  setTint(color) {
    const apply = (node) => {
      if (node instanceof Sprite) {
        node.tint = color;
      }
      node.children?.forEach(apply);
    };
    apply(this.#rootNode);
  }
}
