import { ref, watch, onUnmounted } from 'vue';

interface DebugValue {
  value: any;
  timestamp: number;
  type?: 'info' | 'warning' | 'error' | 'performance';
}

class GameDebug {
  private static instance: GameDebug;
  private debugValues = new Map<string, DebugValue>();
  private subscribers = new Set<(values: Map<string, DebugValue>) => void>();
  private performanceMetrics = new Map<string, number[]>();
  private readonly MAX_METRICS_SAMPLES = 60; // 1 second at 60fps

  private constructor() {}

  public static getInstance(): GameDebug {
    if (!GameDebug.instance) {
      GameDebug.instance = new GameDebug();
    }
    return GameDebug.instance;
  }

  public log(label: string, value: any, type: DebugValue['type'] = 'info'): void {
    this.debugValues.set(label, {
      value,
      timestamp: Date.now(),
      type
    });
    this.notifySubscribers();
  }

  public logPerformance(metric: string, value: number): void {
    if (!this.performanceMetrics.has(metric)) {
      this.performanceMetrics.set(metric, []);
    }
    
    const samples = this.performanceMetrics.get(metric)!;
    samples.push(value);
    
    if (samples.length > this.MAX_METRICS_SAMPLES) {
      samples.shift();
    }
    
    // Calculate average over the last second
    const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
    this.log(metric, `${value.toFixed(2)}ms (avg: ${avg.toFixed(2)}ms)`, 'performance');
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
    log: (label: string, value: any, type?: DebugValue['type']) => 
      debugInstance.log(label, value, type),
    logPerformance: (metric: string, value: number) =>
      debugInstance.logPerformance(metric, value)
  };
} 