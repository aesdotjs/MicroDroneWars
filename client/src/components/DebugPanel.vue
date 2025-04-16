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
        <span class="debug-label">{{ label }}:</span>
        <span class="debug-value">{{ data.value }}</span>
        <span class="debug-timestamp">{{ formatTimestamp(data.timestamp) }}</span>
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
  width: 400px;
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
  display: grid;
  grid-template-columns: 1fr 4fr 1fr;
  align-items: center;
  padding: 2px 5px;
  border-radius: 3px;
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

.debug-label {
  color: #4CAF50;
  margin-right: 5px;
  min-width: 150px;
}

.debug-value {
  color: #fff;
  margin-right: 10px;
}

.debug-timestamp {
  color: #888;
  font-size: 0.8em;
  text-align: right;
}
</style> 