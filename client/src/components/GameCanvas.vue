<template>
  <div class="game-container">
    <canvas id="renderCanvas"></canvas>
    <DebugPanel />
  </div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount } from 'vue';
import { Game } from '@/game/Game';
import DebugPanel from './DebugPanel.vue';

let game: Game;

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