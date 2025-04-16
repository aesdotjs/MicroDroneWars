import { ref, watch, onUnmounted } from 'vue';

interface DebugValue {
  value: any;
  timestamp: number;
}

class GameDebug {
  private static instance: GameDebug;
  private debugValues = new Map<string, DebugValue>();
  private subscribers = new Set<(values: Map<string, DebugValue>) => void>();

  private constructor() {}

  public static getInstance(): GameDebug {
    if (!GameDebug.instance) {
      GameDebug.instance = new GameDebug();
    }
    return GameDebug.instance;
  }

  public log(label: string, value: any): void {
    this.debugValues.set(label, {
      value,
      timestamp: Date.now()
    });
    this.notifySubscribers();
  }

  public getValues(): Map<string, DebugValue> {
    return new Map(this.debugValues);
  }

  public subscribe(callback: (values: Map<string, DebugValue>) => void): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  private notifySubscribers(): void {
    this.subscribers.forEach(callback => callback(this.debugValues));
  }
}

export function useGameDebug() {
  const debugValues = ref<Map<string, DebugValue>>(new Map());
  const debugInstance = GameDebug.getInstance();

  // Subscribe to debug updates
  const unsubscribe = debugInstance.subscribe((values) => {
    debugValues.value = new Map(values);
  });

  // Cleanup subscription on unmount
  onUnmounted(() => {
    unsubscribe();
  });

  return {
    debugValues,
    log: (label: string, value: any) => debugInstance.log(label, value)
  };
} 