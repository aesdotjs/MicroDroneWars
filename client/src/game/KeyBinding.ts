/**
 * Represents a key binding for game input.
 * Tracks the state of a single key including press, release, and hold states.
 */
export class KeyBinding {
    /** The key code this binding represents */
    private key: string;
    /** Whether the key is currently pressed */
    private isPressed: boolean;
    /** Whether the key was just pressed this frame */
    private justPressed: boolean;
    /** Whether the key was just released this frame */
    private justReleased: boolean;

    /**
     * Creates a new KeyBinding instance.
     * @param key - The key code to bind to
     */
    constructor(key: string) {
        this.key = key;
        this.isPressed = false;
        this.justPressed = false;
        this.justReleased = false;
    }

    /**
     * Updates the key state for the current frame.
     * Resets justPressed and justReleased flags.
     */
    public update(): void {
        this.justPressed = false;
        this.justReleased = false;
    }

    /**
     * Sets the pressed state of the key.
     * Updates justPressed and justReleased flags accordingly.
     * @param pressed - Whether the key is pressed
     */
    public setPressed(pressed: boolean): void {
        if (pressed && !this.isPressed) {
            this.justPressed = true;
        } else if (!pressed && this.isPressed) {
            this.justReleased = true;
        }
        this.isPressed = pressed;
    }

    /**
     * Gets the key code this binding represents.
     * @returns The key code
     */
    public getKey(): string {
        return this.key;
    }

    /**
     * Checks if the key is currently pressed.
     * @returns True if the key is pressed, false otherwise
     */
    public getIsPressed(): boolean {
        return this.isPressed;
    }

    /**
     * Checks if the key was just pressed this frame.
     * @returns True if the key was just pressed, false otherwise
     */
    public getJustPressed(): boolean {
        return this.justPressed;
    }

    /**
     * Checks if the key was just released this frame.
     * @returns True if the key was just released, false otherwise
     */
    public getJustReleased(): boolean {
        return this.justReleased;
    }
} 