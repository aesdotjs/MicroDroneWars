import { InputComponent } from '@shared/ecs/types';
import { KeyBinding }  from "./KeyBinding";
import { useGameDebug } from '@/composables/useGameDebug';

const { log } = useGameDebug();

export function createClientInputSystem(canvas: HTMLCanvasElement) {
    // track raw key states (so we can feed them into each KeyBinding.update)
    const rawKeys = new Map<string,boolean>();
    const mouseDelta = { x: 0, y: 0 };
    const frameMouseDelta = { x: 0, y: 0 };
    let hasFocus = false, isPointerLocked = false;
    let lastInputTick = 0;
    
    // 1) build a KeyBinding for every action
    const bindings: Record<keyof InputComponent, KeyBinding> = {
        forward:    new KeyBinding("KeyW"),
        backward:   new KeyBinding("KeyS"),
        left:       new KeyBinding("KeyA"),
        right:      new KeyBinding("KeyD"),
        up:         new KeyBinding("Space"),
        down:       new KeyBinding("ShiftLeft"),
        
        pitchUp:    new KeyBinding("ArrowUp"),
        pitchDown:  new KeyBinding("ArrowDown"),
        yawLeft:    new KeyBinding("ArrowLeft"),
        yawRight:   new KeyBinding("ArrowRight"),
        rollLeft:   new KeyBinding("KeyQ"),
        rollRight:  new KeyBinding("KeyE"),
        
        fire:       new KeyBinding("MouseLeft"),
        zoom:       new KeyBinding("MouseRight"),
        
        nextWeapon:    new KeyBinding("WheelUp"),   // we'll hook wheel manually
        previousWeapon:new KeyBinding("WheelDown"),
        weapon1:       new KeyBinding("Digit1"),
        weapon2:       new KeyBinding("Digit2"),
        weapon3:       new KeyBinding("Digit3"),
        
        // the rest are not real keys but we'll never query them
        forwardPressed:   new KeyBinding(""),
        forwardReleased:  new KeyBinding(""),
        backwardPressed:  new KeyBinding(""),
        backwardReleased: new KeyBinding(""),
        leftPressed:      new KeyBinding(""),
        leftReleased:     new KeyBinding(""),
        rightPressed:     new KeyBinding(""),
        rightReleased:    new KeyBinding(""),
        
        upPressed:        new KeyBinding(""),
        upReleased:       new KeyBinding(""),
        downPressed:      new KeyBinding(""),
        downReleased:     new KeyBinding(""),
        
        pitchUpPressed:    new KeyBinding(""),
        pitchUpReleased:   new KeyBinding(""),
        pitchDownPressed:  new KeyBinding(""),
        pitchDownReleased: new KeyBinding(""),
        yawLeftPressed:    new KeyBinding(""),
        yawLeftReleased:   new KeyBinding(""),
        yawRightPressed:   new KeyBinding(""),
        yawRightReleased:  new KeyBinding(""),
        rollLeftPressed:   new KeyBinding(""),
        rollLeftReleased:  new KeyBinding(""),
        rollRightPressed:  new KeyBinding(""),
        rollRightReleased: new KeyBinding(""),
        
        firePressed:  new KeyBinding(""),
        fireReleased: new KeyBinding(""),
        zoomPressed:  new KeyBinding(""),
        zoomReleased: new KeyBinding(""),
        
        mouseDelta:   new KeyBinding(""),

        aimPointX:      new KeyBinding(""),
        aimPointY:      new KeyBinding(""),
        aimPointZ:      new KeyBinding(""),
        tick:         new KeyBinding(""),
        timestamp:    new KeyBinding(""),
        projectileId: new KeyBinding(""),
    };
    
    // helper to map rawKeys → bindings.update
    function sampleBindings() {
        for (const key of Object.values(bindings)) {
            key.beginFrame();
            if (key.code === "WheelUp" || key.code === "WheelDown") continue;
            key.update( !!rawKeys.get(key.code) );
        }
    }

      // frame‐start: snapshot everything once
    function beginFrame() {
        sampleBindings();
        lastInputTick++;
        // grab & zero out the raw mouseDelta
        frameMouseDelta.x = mouseDelta.x;
        frameMouseDelta.y = mouseDelta.y;
        mouseDelta.x = mouseDelta.y = 0;
    }
    
    // --- DOM event handlers ------------------------------------------
    
    const onKeyDown = (e: KeyboardEvent) => {
        if (!hasFocus && !isPointerLocked) return;
        e.preventDefault();
        rawKeys.set(e.code, true);
    };
    const onKeyUp = (e: KeyboardEvent) => {
        if (!hasFocus && !isPointerLocked) return;
        rawKeys.set(e.code, false);
    };
    const onMouseMove = (e: MouseEvent) => {
        if (!hasFocus || !isPointerLocked) return;
        log('Mouse move', `${e.movementX} ${e.movementY}`);
        mouseDelta.x += e.movementX;
        mouseDelta.y += e.movementY;
    };
    const onWheel = (e: WheelEvent) => {
        // wheels only fire edge‐trigger
        if (e.deltaY < 0) bindings.nextWeapon.triggerPress();
        else             bindings.previousWeapon.triggerPress();
    };
    const onMouseDown = (e: MouseEvent) => {
        if (e.button === 0) rawKeys.set("MouseLeft", true);
        if (e.button === 2) rawKeys.set("MouseRight", true);
    };
    const onMouseUp = (e: MouseEvent) => {
        if (e.button === 0) rawKeys.set("MouseLeft", false);
        if (e.button === 2) rawKeys.set("MouseRight", false);
    };
    const onClick = () => {
        if (!isPointerLocked) {
            (canvas as any).requestPointerLock({ unadjustedMovement: true })
            .then(() => { hasFocus = true; })
            .catch(console.warn);
        }
    };
    const onFocus = () => { hasFocus = true; };
    const onBlur  = () => { hasFocus = false; };
    const onPLockChange = () => {
        isPointerLocked = document.pointerLockElement === canvas;
        if (isPointerLocked) hasFocus = true;
    };
    
    // hook up listeners
    canvas.setAttribute("tabindex","0");
    canvas.style.outline = "none";
    canvas.focus();
    
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("keyup", onKeyUp);
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("wheel", onWheel);
    canvas.addEventListener("mousedown", onMouseDown);
    canvas.addEventListener("mouseup", onMouseUp);
    canvas.addEventListener("click", onClick);
    canvas.addEventListener("focus", onFocus);
    canvas.addEventListener("blur", onBlur);
    document.addEventListener("pointerlockchange", onPLockChange);
    
    // -----------------------------------------------------------------
    
    return {
        beginFrame,
        getInput(): InputComponent {            
            // now assemble your InputComponent
            const I: any = {
                forward: bindings.forward.isDown,
                forwardPressed: bindings.forward.justDown,
                forwardReleased: bindings.forward.justUp,
                
                backward: bindings.backward.isDown,
                backwardPressed: bindings.backward.justDown,
                backwardReleased: bindings.backward.justUp,
                
                left: bindings.left.isDown,
                leftPressed: bindings.left.justDown,
                leftReleased: bindings.left.justUp,
                
                right: bindings.right.isDown,
                rightPressed: bindings.right.justDown,
                rightReleased: bindings.right.justUp,
                
                up: bindings.up.isDown,
                upPressed: bindings.up.justDown,
                upReleased: bindings.up.justUp,
                
                down: bindings.down.isDown,
                downPressed: bindings.down.justDown,
                downReleased: bindings.down.justUp,
                
                pitchUp: bindings.pitchUp.isDown,
                pitchUpPressed: bindings.pitchUp.justDown,
                pitchUpReleased: bindings.pitchUp.justUp,
                
                pitchDown: bindings.pitchDown.isDown,
                pitchDownPressed: bindings.pitchDown.justDown,
                pitchDownReleased:bindings.pitchDown.justUp,
                
                yawLeft: bindings.yawLeft.isDown,
                yawLeftPressed: bindings.yawLeft.justDown,
                yawLeftReleased: bindings.yawLeft.justUp,
                
                yawRight: bindings.yawRight.isDown,
                yawRightPressed: bindings.yawRight.justDown,
                yawRightReleased: bindings.yawRight.justUp,
                
                rollLeft: bindings.rollLeft.isDown,
                rollLeftPressed: bindings.rollLeft.justDown,
                rollLeftReleased: bindings.rollLeft.justUp,
                
                rollRight: bindings.rollRight.isDown,
                rollRightPressed:  bindings.rollRight.justDown,
                rollRightReleased: bindings.rollRight.justUp,
                
                fire: bindings.fire.isDown,
                firePressed: bindings.fire.justDown,
                fireReleased: bindings.fire.justUp,
                
                zoom: bindings.zoom.isDown,
                zoomPressed: bindings.zoom.justDown,
                zoomReleased: bindings.zoom.justUp,
                
                nextWeapon: bindings.nextWeapon.justDown,
                previousWeapon: bindings.previousWeapon.justDown,
                weapon1: bindings.weapon1.justDown,
                weapon2: bindings.weapon2.justDown,
                weapon3: bindings.weapon3.justDown,
                
                mouseDelta: { x: frameMouseDelta.x, y: frameMouseDelta.y },
                
                // filled in downstream:
                tick:      lastInputTick,
                timestamp: Date.now(),
                projectileId: 0
            } as InputComponent;
            
            return I;
        },
        
        isIdle(): boolean {
            return Object.values(bindings).every(b => !b.isDown && !b.justDown && !b.justUp) && 
            frameMouseDelta.x === 0 && 
            frameMouseDelta.y === 0;
        },
        
        cleanup() {
            document.removeEventListener("keydown",     onKeyDown);
            document.removeEventListener("keyup",       onKeyUp);
            document.removeEventListener("mousemove",   onMouseMove);
            document.removeEventListener("wheel",       onWheel);
            canvas.removeEventListener("mousedown",     onMouseDown);
            canvas.removeEventListener("mouseup",       onMouseUp);
            canvas.removeEventListener("click",         onClick);
            canvas.removeEventListener("focus",         onFocus);
            canvas.removeEventListener("blur",          onBlur);
            document .removeEventListener("pointerlockchange", onPLockChange);
            if (isPointerLocked) document.exitPointerLock();
        }
    };
}
