export class KeyBinding {
    private key: string;
    private isPressed: boolean;
    private justPressed: boolean;
    private justReleased: boolean;

    constructor(key: string) {
        this.key = key;
        this.isPressed = false;
        this.justPressed = false;
        this.justReleased = false;
    }

    public update(): void {
        this.justPressed = false;
        this.justReleased = false;
    }

    public setPressed(pressed: boolean): void {
        if (pressed && !this.isPressed) {
            this.justPressed = true;
        } else if (!pressed && this.isPressed) {
            this.justReleased = true;
        }
        this.isPressed = pressed;
    }

    public getKey(): string {
        return this.key;
    }

    public getIsPressed(): boolean {
        return this.isPressed;
    }

    public getJustPressed(): boolean {
        return this.justPressed;
    }

    public getJustReleased(): boolean {
        return this.justReleased;
    }
} 