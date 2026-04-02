<template>
  <div>
    <Topbar
      :section-label="sectionLabel"
      :page-label="pageLabel"
      :mobile-nav-open="mobileNavOpen"
      @toggle-nav="toggleNav"
    />
    <div v-if="mobileNavOpen" class="sidebar-overlay" @click="closeNav" />
    <div class="app-wrap">
      <Sidebar :mobile-open="mobileNavOpen" @navigate="closeNav" />
      <main class="main-content">
        <div class="content-breadcrumb" v-if="sectionLabel || pageLabel">
          <span>{{ sectionLabel || 'Nizzia City' }}</span>
          <span v-if="sectionLabel && pageLabel">/</span>
          <strong v-if="pageLabel">{{ pageLabel }}</strong>
        </div>
        <div class="content-section">
          <slot />
        </div>
        <AppFooter />
      </main>
    </div>
  </div>
  
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import Topbar from '../components/Topbar.vue'
import Sidebar from '../components/Sidebar.vue'
import AppFooter from '../components/AppFooter.vue'
import '../assets/layout.css'

const route = useRoute()
const mobileNavOpen = ref(false)

const sectionLabel = computed(() => route.meta?.section || '')
const pageLabel = computed(() => route.meta?.title || '')

function toggleNav() {
  mobileNavOpen.value = !mobileNavOpen.value
}

function closeNav() {
  mobileNavOpen.value = false
}

watch(() => route.fullPath, () => {
  mobileNavOpen.value = false
})
</script>

<style scoped>
/* Layout styling largely in layout.css */
</style>
