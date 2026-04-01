<template>
  <div class="panel">
    <h3>Basic Information</h3>
    <ul class="kv">
      <li><span class="k">Level</span><span class="v">{{ level }}</span></li>
      <li><span class="k">Age</span><span class="v">{{ age }} days</span></li>
      <li><span class="k">Role</span><span class="v">{{ playerRole }}</span></li>
      <li><span class="k">Status</span><span class="v">{{ playerStatus }}</span></li>
      <li><span class="k">NPC</span><span class="v">{{ npc ? 'Yes' : 'No' }}</span></li>
      <li><span class="k">Experience</span><span class="v">{{ exp }}</span></li>
    </ul>
  </div>
</template>

<script setup>
defineProps({
  level: { type: Number, default: 0 },
  age: { type: Number, default: 0 },
  playerRole: { type: String, default: 'Player' },
  playerStatus: { type: String, default: 'Active' },
  npc: { type: Boolean, default: false },
  exp: { type: Number, default: 0 },
})
</script>
