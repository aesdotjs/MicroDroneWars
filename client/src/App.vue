<template>
  <div class="app">
    <GameCanvas />
  </div>
</template>

<script setup lang="ts">
import GameCanvas from './components/GameCanvas.vue';
</script>

<style>
html, body {
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
  overflow: hidden;
}

.app, #app {
  width: 100%;
  height: 100%;
}
</style> 