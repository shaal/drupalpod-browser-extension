<script lang="ts">
import { computed, ComputedRef, defineComponent } from 'vue';
import drupalpod from '@/drupalpod/drupalpod.vue';
import serviceContainer from '@/services/service-container';

export default defineComponent({
  components: { drupalpod },
  errorMessages: [
    'Open an issue page on Drupal.org to see the available options',
  ],
  provide(): {[key: string]: ComputedRef<any>} {
    return {
      drupal: computed(() => serviceContainer.get('drupal')),
    };
  },
});
</script>

<template>
  <div class="container">
    <drupalpod></drupalpod>
  </div>
</template>
