<template>
  <NavBar />
  <div style="padding: 24px; box-sizing: border-box; min-height: 100vh; background: inherit;">
    <h4 style="margin-bottom: 16px;">EventStream  ({{ events.length }}/{{ maxEvents }})</h4>
    <div style="display: flex; align-items: center; gap: 8px; max-width: 420px; margin-bottom: 16px;">
      <cdx-select
        v-model:selected="selectedStream"
        :menu-items="streamMenuItems"
        default-label="Select stream"
        style="flex: 1 1 0;"
      />
      <cdx-button
        weight="quiet"
        aria-label="Settings"
        @click="showFilterDialog = true"
      >
        <cdx-icon :icon="cdxIconSettings" />
      </cdx-button>
    </div>
    <span>See: <a href="https://stream.wikimedia.org/v2/ui/#/" target="_blank" rel="noopener">https://stream.wikimedia.org/v2/ui/#/</a></span>
    <FeedSettingsDialog
      :show="showFilterDialog"
      :max-events-input="maxEventsInput"
      :sample-percent-input="samplePercentInput"
      @update:show="showFilterDialog = $event"
      @update:max-events-input="maxEventsInput = $event"
      @update:sample-percent-input="samplePercentInput = $event"
      @apply="applyFilter"
    />
    <div v-if="selectedStream === 'recentchange'">
      <div class="table-scroll">
        <cdx-table
          :columns="tableColumns"
          :data="tableData"
          :caption="`Event stream: ${selectedStream}`"
          :show-vertical-borders="true"
          class="event-table"
        >
          <template #item-title="{ item }">
            <a :href="item.url" target="_blank">{{ item.text || 'N/A' }}</a>
          </template>
          <template #item-user="{ item }">
            <a :href="item.url" target="_blank">{{ item.text || 'N/A' }}</a>
          </template>
        </cdx-table>
      </div>
    </div>
    <!-- Raw JSON fallback for other streams -->
    <div v-else>
      <cdx-table
        :columns="[{ id: 'raw', label: 'JSON' }]"
        :data="events.map((event, idx) => ({ raw: JSON.stringify(event, null, 2), id: idx }))"
        :caption="`Event stream: ${selectedStream}`"
        :show-vertical-borders="true"
        class="event-table"
      >
        <template #item-raw="{ item }">
          <pre style="white-space: pre-wrap; word-break: break-all; max-width: 100vw;">{{ item }}</pre>
        </template>
      </cdx-table>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { fetchAvailableStreams } from '../utils/fetchAvailableStreams';
import { onMounted, ref, onUnmounted, watch, computed } from 'vue';
import { subscribeToEventStream } from '../utils/eventStream';
import NavBar from './NavBar.vue';
import { CdxTable, CdxSelect } from '@wikimedia/codex';
import { CdxButton, CdxIcon } from '@wikimedia/codex';
import { cdxIconSettings } from '@wikimedia/codex-icons';
import FeedSettingsDialog from './FeedSettingsDialog.vue';
import { useRoute, useRouter } from 'vue-router';

const availableStreams = ref<{ name: string; label?: string }[]>([]);
const selectedStream = ref('recentchange');
const events = ref<RecentChangeEvent[]>([]);
const maxEvents = ref(100);
const maxEventsInput = ref(maxEvents.value);
const samplePercent = ref(100); // Default to 100%
const samplePercentInput = ref(samplePercent.value);
const showFilterDialog = ref(false);
let eventStreamInstance: ReturnType<typeof subscribeToEventStream> | null = null;

const tableColumns = [
  { id: 'server_name', label: 'Site' },
  { id: 'title', label: 'Title' },
  { id: 'user', label: 'User' },
  { id: 'comment', label: 'Comment' },
  { id: 'timestamp', label: 'Timestamp' },
];

const tableData = computed(() => events.value.map(e => ({
  server_name: e.server_name ?? '',
  title: {
    text: e.title ?? '',
    url: e.title_url ?? '',
  },
  user: {
    text: e.user ?? '',
    url: e.user ? `https://${e.server_name}/wiki/User:${encodeURIComponent(e.user)}` : '',
  },
  comment: e.comment ?? '',
  timestamp: formatTimestamp(e.timestamp),
})));

function formatTimestamp(ts: string | number | undefined): string {
  if (!ts) return '';
  // If already a string and looks like ISO, just return a shortened version
  if (typeof ts === 'string' && ts.length > 10 && ts.includes('T')) {
    // e.g. 2024-06-28T12:34:56Z -> 2024-06-28 12:34:56
    return ts.replace('T', ' ').replace('Z', '').slice(0, 19);
  }
  // If it's a number or string timestamp (UNIX seconds)
  const n = typeof ts === 'string' ? parseInt(ts, 10) : ts;
  if (!isNaN(Number(n))) {
    const d = new Date(Number(n) * (String(n).length === 10 ? 1000 : 1));
    if (!isNaN(d.getTime())) {
      return d.toISOString().replace('T', ' ').replace('Z', '').slice(0, 19);
    }
  }
  return String(ts);
}

// Type for recentchange event
interface RecentChangeEvent {
  id?: string | number;
  server_name?: string;
  title?: string;
  title_url?: string;
  user?: string;
  comment?: string;
  timestamp?: string | number;
  [key: string]: unknown;
}

const streamMenuItems = computed(() => availableStreams.value.map(s => ({
  label: s.label || s.name,
  value: s.name,
})));

function applyFilter() {
  maxEvents.value = Math.max(1, Math.min(1000, maxEventsInput.value));
  samplePercent.value = Math.max(1, Math.min(100, samplePercentInput.value));
  showFilterDialog.value = false;
  // Trim events if needed
  if (events.value.length > maxEvents.value) {
    events.value.splice(maxEvents.value);
  }
  updateUrlParams();
}

function startStream() {
  if (eventStreamInstance) {
    eventStreamInstance.close();
  }
  events.value = [];
  eventStreamInstance = subscribeToEventStream(selectedStream.value);
  eventStreamInstance.onMessage((event: unknown) => {
    // Sampling logic: show all if 100%, otherwise sample
    if (samplePercent.value < 100 && Math.random() * 100 >= samplePercent.value) return;
    // Accept only objects for events
    if (typeof event === 'object' && event !== null) {
      events.value.unshift(event as RecentChangeEvent);
      if (events.value.length > maxEvents.value) {
        events.value.splice(maxEvents.value);
      }
    }
  });
  eventStreamInstance.onError((error: Event) => {
    console.error('Error in event stream:', error);
  });
}

async function loadAvailableStreams() {
  const streams = await fetchAvailableStreams();
  availableStreams.value = streams.map((name: string) => ({ name, label: name }));
  // If the current selectedStream is not in the new list, reset it
  if (!streams.includes(selectedStream.value)) {
    selectedStream.value = streams[0] || '';
  }
}

const route = useRoute();
const router = useRouter();

// Initialize from URL params if present
onMounted(() => {
  const { stream, max, sample } = route.query;
  if (typeof stream === 'string') {
    selectedStream.value = stream;
  }
  if (typeof max === 'string' && !isNaN(Number(max))) {
    maxEvents.value = Math.max(1, Math.min(1000, Number(max)));
    maxEventsInput.value = maxEvents.value;
  }
  if (typeof sample === 'string' && !isNaN(Number(sample))) {
    samplePercent.value = Math.max(1, Math.min(100, Number(sample)));
    samplePercentInput.value = samplePercent.value;
  }
  loadAvailableStreams();
  startStream();
});

function updateUrlParams() {
  router.replace({
    query: {
      ...route.query,
      stream: selectedStream.value,
      max: String(maxEvents.value),
      sample: String(samplePercent.value),
    },
  });
}

watch([selectedStream, maxEvents, samplePercent], updateUrlParams);

onUnmounted(() => {
  if (eventStreamInstance) {
    eventStreamInstance.close();
  }
});

watch(selectedStream, () => {
  events.value = [];
  maxEventsInput.value = maxEvents.value;
  samplePercentInput.value = samplePercent.value;
  startStream();
  updateUrlParams();
});
</script>

<style scoped>
.event-table :deep(th),
.event-table :deep(td) {
  white-space: normal;
  overflow: hidden;
  text-overflow: ellipsis;
  padding: 8px 12px;
  word-break: break-word;
  max-width: 1px;
}
</style>