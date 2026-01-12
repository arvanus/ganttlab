<template>
  <div class="relative" ref="dropdownContainer">
    <button
      class="cursor-pointer transition duration-200 ease-in hover:text-lead-700 flex items-center text-gray-600 font-medium"
      @click="toggleDropdown"
    >
      <span class="mr-1">Copy</span>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="h-4 w-4"
        :class="{ 'transform rotate-180': isOpen }"
        viewBox="0 0 20 20"
        fill="currentColor"
        style="transition: transform 0.2s ease"
      >
        <path
          fill-rule="evenodd"
          d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
          clip-rule="evenodd"
        />
      </svg>
    </button>

    <transition name="dropdown-fade">
      <div
        v-if="isOpen"
        class="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50"
      >
        <div class="py-1">
          <button
            class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
            @click="copyAsUrl"
          >
            <Icon size="16" name="link-outline" class="mr-2" />
            Copy as URL
          </button>
          <button
            class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
            @click="copyAsPng"
          >
            <Icon size="16" name="image-outline" class="mr-2" />
            Copy as PNG
          </button>
        </div>
      </div>
    </transition>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';
import Icon from './Icon.vue';

@Component({
  components: {
    Icon,
  },
})
export default class ShareDropdown extends Vue {
  public isOpen = false;

  toggleDropdown() {
    this.isOpen = !this.isOpen;
  }

  closeDropdown() {
    this.isOpen = false;
  }

  copyAsUrl() {
    this.$emit('copy-as-url');
    this.closeDropdown();
  }

  copyAsPng() {
    this.$emit('copy-as-png');
    this.closeDropdown();
  }

  handleClickOutside(event: MouseEvent) {
    const container = this.$refs.dropdownContainer as HTMLElement;
    if (container && !container.contains(event.target as Node)) {
      this.closeDropdown();
    }
  }

  mounted() {
    document.addEventListener('click', this.handleClickOutside);
  }

  beforeDestroy() {
    document.removeEventListener('click', this.handleClickOutside);
  }
}
</script>

<style scoped>
.dropdown-fade-enter-active,
.dropdown-fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.dropdown-fade-enter,
.dropdown-fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
