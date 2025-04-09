export class FocusManager {
    constructor(canvas) {
        this.canvas = canvas;
        this.isFocused = false;
        this.originalCursor = 'default';
        
        // Store original handlers
        this.originalKeyDown = document.onkeydown;
        this.originalKeyUp = document.onkeyup;
        this.originalKeyPress = document.onkeypress;
        
        this.initialize();
    }

    initialize() {
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

    enterFocusMode() {
        if (!this.isFocused) {
            this.isFocused = true;
            this.originalCursor = document.body.style.cursor;
            document.body.style.cursor = 'none';
            this.canvas.style.cursor = 'none';
            
            // Lock pointer if available
            if (this.canvas.requestPointerLock) {
                this.canvas.requestPointerLock();
            }
        }
    }

    exitFocusMode() {
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

    dispose() {
        this.exitFocusMode();
        document.removeEventListener('keydown', this.handleKeyDown);
        document.removeEventListener('keyup', this.handleKeyUp);
        document.removeEventListener('keypress', this.handleKeyPress);
    }
} 