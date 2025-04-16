<template>
  <div class="debug-panel">
    <div class="debug-header">
      <span>Debug Values</span>
      <button class="toggle-button" @click="isExpanded = !isExpanded">
        {{ isExpanded ? '▼' : '▶' }}
      </button>
    </div>
    <div v-if="isExpanded" class="debug-content">
      <div v-for="[label, data] in debugValues" :key="label" 
           :class="['debug-item', data.type]">
        <template v-if="typeof data.value === 'object' && data.value !== null">
          <div class="debug-object">
            <div class="debug-object-header">
              <span class="debug-label">{{ label }}:</span>
              <span class="debug-timestamp">{{ formatTimestamp(data.timestamp) }}</span>
            </div>
            <div v-for="(value, key) in data.value" :key="key" class="debug-object-row">
              <span class="debug-object-key">{{ key }}:</span>
              <span class="debug-object-value">{{ formatValue(value) }}</span>
            </div>
          </div>
        </template>
        <template v-else>
          <span class="debug-label">{{ label }}:</span>
          <span class="debug-value">{{ data.value }}</span>
          <span class="debug-timestamp">{{ formatTimestamp(data.timestamp) }}</span>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useGameDebug } from '@/composables/useGameDebug';

const { debugValues } = useGameDebug();
const isExpanded = ref(true);

const formatTimestamp = (timestamp: number) => {
  return new Date(timestamp).toLocaleTimeString();
};

const formatValue = (value: any) => {
  if (typeof value === 'number') {
    return value.toFixed(2);
  }
  if (typeof value === 'object' && value !== null) {
    if (value._isDirty) {
      return `X: ${value._x?.toFixed(2) ?? 'null'}, Y: ${value._y?.toFixed(2) ?? 'null'}, Z: ${value._z?.toFixed(2) ?? 'null'}`;
    }
    return JSON.stringify(value, null, 2);
  }
  return value;
};
</script>

<style scoped>
.debug-panel {
  position: fixed;
  top: 20px;
  right: 20px;
  background: rgba(0, 0, 0, 0.8);
  color: #fff;
  padding: 10px;
  border-radius: 5px;
  font-family: monospace;
  width: 600px;
  overflow-y: auto;
  overflow-x: hidden;
}

.debug-header {
  font-weight: bold;
  margin-bottom: 10px;
  border-bottom: 1px solid #444;
  padding-bottom: 5px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.toggle-button {
  background: none;
  border: none;
  color: #fff;
  cursor: pointer;
  font-size: 1.2em;
  padding: 0;
}

.debug-content {
  max-height: 400px;
  overflow-y: auto;
}

.debug-item {
  margin: 5px 0;
  padding: 2px 5px;
  border-radius: 3px;
}

.debug-object {
  margin: 5px 0;
  padding: 5px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 3px;
  width: 100%;
}

.debug-object-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 5px;
  padding-bottom: 5px;
  border-bottom: 1px solid #444;
}

.debug-object-row {
  display: grid;
  grid-template-columns: 1fr 4fr;
  gap: 10px;
  padding: 2px 0;
}

.debug-object-key {
  color: #4CAF50;
  font-size: 0.9em;
  word-break: break-all;
}

.debug-object-value {
  color: #fff;
  font-size: 0.9em;
  text-align: right;
  word-break: break-all;
}

.debug-item.info {
  background: rgba(76, 175, 80, 0.1);
}

.debug-item.warning {
  background: rgba(255, 152, 0, 0.1);
}

.debug-item.error {
  background: rgba(244, 67, 54, 0.1);
}

.debug-item.performance {
  background: rgba(33, 150, 243, 0.1);
}

.debug-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.debug-label {
  color: #4CAF50;
  margin-right: 5px;
  min-width: 150px;
}

.debug-value {
  color: #fff;
  text-align: right;
  margin-left: auto;
  width: 100%;
  margin-right: 10px;
}

.debug-timestamp {
  color: #888;
  font-size: 0.8em;
  text-align: right;
}
</style> 