<template>
  <div class="relative p-6">
    <div class="mb-4">
      <label class="block text-gray-700 text-sm font-bold mb-2">
        Enter username to filter issues assigned to:
      </label>
      <input
        v-model="assigneeUsername"
        type="text"
        class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
        placeholder="Enter username"
        @keyup.enter="confirmConfiguration"
        autofocus
      />
    </div>
    <div class="flex items-center justify-between">
      <button
        class="bg-lead-600 hover:bg-lead-500 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:opacity-50 disabled:cursor-not-allowed"
        :disabled="!assigneeUsername"
        @click="confirmConfiguration"
      >
        Show Issues
      </button>
    </div>
    <p class="mt-4 text-gray-600 text-sm">
      This will show all open issues and tasks assigned to the specified user
      across all repositories accessible with your access token.
    </p>
  </div>
</template>

<script lang="ts">
import { Component, Vue, Emit, Prop } from 'vue-property-decorator';
import { Source } from 'ganttlab-entities';

@Component({
  components: {},
})
export default class AssignedToViewConfigurator extends Vue {
  public assigneeUsername = '';

  @Prop({ required: true }) readonly sourceGateway!: Source;

  get configuration() {
    if (this.assigneeUsername) {
      return {
        assigneeUsername: this.assigneeUsername,
        tasks: {
          page: 1,
          pageSize: 50,
        },
      };
    }
    return null;
  }

  @Emit('set-configuration')
  confirmConfiguration() {
    const configuration = this.configuration;
    if (configuration) {
      return this.configuration;
    }
  }
}
</script>

