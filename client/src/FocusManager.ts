export class FocusManager {
    private canvas: HTMLCanvasElement;
    private isFocused: boolean;
    private originalCursor: string;
    private originalKeyDown: ((this: Document, ev: KeyboardEvent) => any) | null;
    private originalKeyUp: ((this: Document, ev: KeyboardEvent) => any) | null;
    private originalKeyPress: ((this: Document, ev: KeyboardEvent) => any) | null;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.isFocused = false;
        this.originalCursor = 'default';
        
        // Store original handlers
        this.originalKeyDown = document.onkeydown;
        this.originalKeyUp = document.onkeyup;
        this.originalKeyPress = document.onkeypress;
        
        this.initialize();
    }

    private initialize(): void {
        // Prevent default browser shortcuts
        document.addEventListener('keydown', (e) => {
            if (this.isFocused) {
                // Prevent common browser shortcuts
                if (e.ctrlKey || e.metaKey) {
                    switch (e.key.toLowerCase()) {
                        case 's':
                        case 'p':
                        case 'w':
                        case 'n':
                        case 't':
                            e.preventDefault();
                            e.stopPropagation();
                            break;
                    }
                }
            }
        }, true);

        // Handle focus/blur events
        this.canvas.addEventListener('click', () => this.enterFocusMode());
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.exitFocusMode();
            }
        });

        // Prevent context menu
        this.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });
    }

    enterFocusMode(): void {
        if (!this.isFocused) {
            this.isFocused = true;
            this.originalCursor = document.body.style.cursor;
            document.body.style.cursor = 'none';
            this.canvas.style.cursor = 'none';
            
            // Lock pointer if available
            if ('requestPointerLock' in this.canvas) {
                const promise = (this.canvas as any).requestPointerLock();
                if (promise) {
                    promise.then(() => {
                        console.log('Pointer lock acquired');
                    }).catch((err: Error) => {
                        console.warn('Pointer lock request failed:', err);
                    });
                }
            }
        }
    }

    exitFocusMode(): void {
        if (this.isFocused) {
            this.isFocused = false;
            document.body.style.cursor = this.originalCursor;
            this.canvas.style.cursor = this.originalCursor;
            
            // Exit pointer lock if available
            if (document.exitPointerLock) {
                document.exitPointerLock();
            }
        }
    }

    dispose(): void {
        this.exitFocusMode();
        document.removeEventListener('keydown', this.handleKeyDown);
        document.removeEventListener('keyup', this.handleKeyUp);
        document.removeEventListener('keypress', this.handleKeyPress);
    }

    private handleKeyDown = (event: KeyboardEvent): void => {
        if (this.originalKeyDown) {
            this.originalKeyDown.call(document, event);
        }
    };

    private handleKeyUp = (event: KeyboardEvent): void => {
        if (this.originalKeyUp) {
            this.originalKeyUp.call(document, event);
        }
    };

    private handleKeyPress = (event: KeyboardEvent): void => {
        if (this.originalKeyPress) {
            this.originalKeyPress.call(document, event);
        }
    };
} 