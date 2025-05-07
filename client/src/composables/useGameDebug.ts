import { ref } from 'vue';

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
  private readonly MAX_DEBUG_VALUES = 1000; // Maximum number of debug values to keep
  private readonly CLEANUP_INTERVAL = 30000; // Cleanup every 30 seconds

  private constructor() {
    // Start cleanup interval
    setInterval(() => this.cleanup(), this.CLEANUP_INTERVAL);
  }

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

    // Clean up old values if we exceed the maximum
    if (this.debugValues.size > this.MAX_DEBUG_VALUES) {
      const oldestKey = Array.from(this.debugValues.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp)[0][0];
      this.debugValues.delete(oldestKey);
    }

    this.notifySubscribers();
  }

  public clearVehicleLogs(vehicleId: string): void {
    const prefix = `Player ${vehicleId}`;
    for (const key of this.debugValues.keys()) {
      if (key.startsWith(prefix)) {
        this.debugValues.delete(key);
      }
    }
    this.notifySubscribers();
  }

  public clearAll(): void {
    this.debugValues.clear();
    this.performanceMetrics.clear();
    this.notifySubscribers();
  }

  private cleanup(): void {
    const now = Date.now();
    const oneMinuteAgo = now - 60000; // Keep values for 1 minute

    for (const [key, value] of this.debugValues.entries()) {
      if (value.timestamp < oneMinuteAgo) {
        this.debugValues.delete(key);
      }
    }

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

  return {
    debugValues,
    log: (label: string, value: any, type?: DebugValue['type']) => 
      debugInstance.log(label, value, type),
    logPerformance: (metric: string, value: number) =>
      debugInstance.logPerformance(metric, value),
    clearVehicleLogs: (vehicleId: string) =>
      debugInstance.clearVehicleLogs(vehicleId),
    clearAll: () => debugInstance.clearAll(),
    unsubscribe: () => unsubscribe()
  };
} 