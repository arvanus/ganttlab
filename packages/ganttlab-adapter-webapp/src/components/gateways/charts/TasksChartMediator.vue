<template>
  <div class="w-full">
    <component
      v-if="chart"
      :is="chartComponent"
      :tasks="tasks"
      :searchTerm="searchTerm"
      :searchMode="searchMode"
      :metadata="metadata"
    />
  </div>
</template>

<script lang="ts">
import { Component, Vue, Prop } from 'vue-property-decorator';
import { getModule } from 'vuex-module-decorators';
import MainModule from '../../../store/modules/MainModule';
import legacyChart from '../../gateways/charts/legacy/Chart.vue';
import { Task } from 'ganttlab-entities';

const mainState = getModule(MainModule);

@Component({
  components: {
    legacyChart,
  },
})
export default class TasksChartMediator extends Vue {
  @Prop() readonly tasks!: Array<Task>;
  @Prop() readonly chart!: string;
  @Prop({ default: '' }) readonly metadata!: string;

  mounted() {
    console.log('📦 TasksChartMediator.vue - received metadata:', this.metadata);
  }

  get chartComponent() {
    return `${this.chart}Chart`;
  }

  get searchTerm(): string {
    return mainState.issueFilterTerm || '';
  }

  get searchMode(): 'simple' | 'regex' {
    return mainState.issueFilterMode || 'simple';
  }
}
</script>
