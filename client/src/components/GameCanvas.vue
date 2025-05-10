<template>
  <div class="game-container">
    <canvas id="renderCanvas"></canvas>
    <GameHUD />
    <DebugPanel :expanded="debugPanelExpanded" @update:expanded="onUpdateDebugPanel" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue';
import { Game } from '@/game/Game';
import DebugPanel from './DebugPanel.vue';
import GameHUD from './GameHUD.vue';

let game: Game;
let debugPanelExpanded = ref(false);

const onUpdateDebugPanel = (value: boolean) => {
  debugPanelExpanded.value = value;
  game.setDebugMode(value);
};

onMounted(() => {
  if (game) {
    console.log('Cleaning up game');
    game.cleanup();
  }
  game = new Game();
});

onBeforeUnmount(() => {
  console.log('Unmounting game');
  game.cleanup();
});
</script>

<style scoped>
.game-container {
  width: 100%;
  height: 100%;
  margin: 0;
  overflow: hidden;
  position: relative;
}

#renderCanvas {
  width: 100%;
  height: 100%;
}
</style> 