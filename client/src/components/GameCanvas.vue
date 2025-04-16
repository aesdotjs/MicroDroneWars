<template>
  <div class="game-container">
    <canvas id="renderCanvas"></canvas>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import { Game } from '@/game/Game';

let game: Game;
onMounted(() => {
  game = new Game();
});

onUnmounted(() => {
  game.cleanup();
});
</script>

<style scoped>
.game-container {
  width: 100%;
  height: 100%;
  margin: 0;
  overflow: hidden;
}

#renderCanvas {
  width: 100%;
  height: 100%;
}
</style> 