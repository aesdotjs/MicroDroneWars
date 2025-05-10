<template>
  <div class="game-hud">
    <!-- Top section -->
    <div class="hud-top">
      <div class="health-bar">
        <div class="health-fill" :style="{ width: healthPercentage + '%' }"></div>
        <span class="health-text">{{ health }}/{{ maxHealth }}</span>
      </div>
      <div class="weapon-info">
        <span class="weapon-name">{{ currentWeapon }}</span>
        <div class="heat-bar">
          <div class="heat-fill" :style="{ width: heatPercentage + '%' }"></div>
        </div>
      </div>
    </div>

    <!-- Center section -->
    <div class="hud-center">
      <img src="/assets/textures/crosshair.png" alt="Crosshair" />
    </div>

    <!-- Bottom section -->
    <div class="hud-bottom">
      <div class="speed-indicator">
        <span class="speed-value">{{ speed }} m/s</span>
      </div>
      <div class="altitude-indicator">
        <span class="altitude-value">{{ altitude }} m</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

// Example reactive data - replace with actual game state
const health = ref(100);
const maxHealth = ref(100);
const currentWeapon = ref('Chaingun');
const heat = ref(0);
const speed = ref(0);
const altitude = ref(0);

// Computed properties
const healthPercentage = computed(() => (health.value / maxHealth.value) * 100);
const heatPercentage = computed(() => heat.value * 100);
</script>

<style scoped>
.game-hud {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  color: white;
  font-family: 'Arial', sans-serif;
  user-select: none;
}

/* Top section */
.hud-top {
  position: absolute;
  top: 20px;
  left: 20px;
  right: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.health-bar {
  width: 200px;
  height: 20px;
  background: rgba(0, 0, 0, 0.5);
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 10px;
  position: relative;
  overflow: hidden;
}

.health-fill {
  height: 100%;
  background: linear-gradient(90deg, #ff3838, #ff5e3a);
  transition: width 0.3s ease;
}

.health-text {
  position: absolute;
  width: 100%;
  text-align: center;
  line-height: 20px;
  font-size: 12px;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
}

.weapon-info {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 5px;
}

.weapon-name {
  font-size: 16px;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
}

.heat-bar {
  width: 150px;
  height: 4px;
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 2px;
  overflow: hidden;
}

.heat-fill {
  height: 100%;
  background: linear-gradient(90deg, #ff9500, #ff2d55);
  transition: width 0.2s ease;
}

/* Center section */
.hud-center {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}


/* Bottom section */
.hud-bottom {
  position: absolute;
  bottom: 20px;
  left: 20px;
  right: 20px;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
}

.speed-indicator,
.altitude-indicator {
  background: rgba(0, 0, 0, 0.5);
  padding: 8px 12px;
  border-radius: 5px;
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.speed-value,
.altitude-value {
  font-size: 14px;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
}
</style> 