<script lang="ts">
  import { onMount } from 'svelte';
  import { initOneSignal } from '$lib/initOneSignal';

  onMount(() => {
    initOneSignal();
  });
</script>

<slot />
