<template>
  <div class="panel profile-header">
    <img class="profile-header__avatar" :src="profileImage" :alt="`${name} profile image`" @error="onImgErr" />

    <div class="profile-header__identity">
      <div class="profile-header__title">
        <strong>{{ name }}</strong>
        <span class="muted">#{{ id }}</span>
      </div>
      <div class="muted">{{ playerTitle }} - {{ playerStatus }}</div>
    </div>

    <div class="profile-header__vitals">
      <div><span class="muted">HP</span> <strong>{{ vitals.health }}/100</strong></div>
      <div><span class="muted">Energy</span> <strong>{{ vitals.energy }}/{{ vitals.energyMax }}</strong></div>
      <div><span class="muted">Nerve</span> <strong>{{ vitals.nerve }}/{{ vitals.nerveMax }}</strong></div>
      <div><span class="muted">Happy</span> <strong>{{ vitals.happy }}/{{ vitals.happyMax }}</strong></div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  name: { type: String, required: true },
  id: { type: Number, required: true },
  playerTitle: { type: String, default: '' },
  playerStatus: { type: String, default: '' },
  profileImage: { type: String, required: true },
  vitals: { type: Object, required: true },
  fallbackImage: { type: String, required: true },
})

function onImgErr(e) {
  e.target.src = props.fallbackImage
}
</script>

<style scoped>
.profile-header { display: grid; grid-template-columns: 88px 1fr auto; gap: 12px; align-items: center; }
.profile-header__avatar {
  width: 88px;
  height: 88px;
  object-fit: cover;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--bg-alt);
}
.profile-header__title { display: flex; align-items: center; gap: 8px; font-size: 15px; }
.profile-header__vitals { display: flex; flex-wrap: wrap; gap: 10px; }

@media (max-width: 760px) {
  .profile-header { grid-template-columns: 72px 1fr; }
  .profile-header__avatar { width: 72px; height: 72px; }
  .profile-header__vitals { grid-column: 1 / -1; }
}
</style>
