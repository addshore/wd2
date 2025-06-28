<template>
  <div>
    <NavBar />
    <v-container fluid>
      <v-row>
        <v-col cols="12">
          <h4>EventStream  ({{ events.length }}/{{ maxEvents }})</h4>
          <div style="display: flex; align-items: center; gap: 8px; max-width: 420px; margin-bottom: 16px;">
            <v-select
              v-model="selectedStream"
              :items="availableStreams"
              label="Select stream"
              item-title="name"
              item-value="name"
              style="flex: 1 1 0;"
            />
            <v-btn density="compact" @click="showFilterDialog = true">
              <v-icon>mdi-cog</v-icon>
            </v-btn>
          </div>
          <v-dialog max-width="500px" v-model="showFilterDialog">
            <v-card>
              <v-card-title>
                <span class="headline">Feed Settings</span>
              </v-card-title>
              <v-card-text>
                <v-text-field
                  v-model.number="maxEventsInput"
                  label="Maximum number of entries"
                  type="number"
                  min="1"
                  max="1000"
                  style="max-width: 200px;"
                />
                <v-text-field
                  v-model.number="samplePercentInput"
                  label="Sample percent (%)"
                  type="number"
                  min="1"
                  max="100"
                  style="max-width: 200px; margin-top: 16px;"
                />
              </v-card-text>
              <v-card-actions>
                <v-spacer />
                <v-btn color="primary" @click="applyFilter">
                  Apply
                </v-btn>
                <v-btn color="secondary" @click="showFilterDialog = false">
                  Cancel
                </v-btn>
              </v-card-actions>
            </v-card>
          </v-dialog>
          <div v-if="selectedStream === 'recentchange'">
            <v-table height="600px" fixed-header style="width: 100%; max-width: 100%;">
              <thead>
                <tr>
                  <th>Site</th>
                  <th>Title</th>
                  <th>User</th>
                  <th>Comment</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="event in events" :key="event.id">
                  <td>{{ event.server_name }}</td>
                  <td>{{ event.title }}</td>
                  <td>{{ event.user }}</td>
                  <td>{{ event.comment }}</td>
                  <td>{{ event.timestamp }}</td>
                </tr>
              </tbody>
            </v-table>
          </div>
          <div v-else>
            <v-table height="600px" fixed-header style="width: 100%; max-width: 100%;">
              <thead>
                <tr>
                  <th>Raw JSON Event</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(event, idx) in events" :key="idx">
                  <td>
                    <pre style="white-space: pre-wrap; word-break: break-all; max-width: 100vw;">{{ JSON.stringify(event, null, 2) }}</pre>
                  </td>
                </tr>
              </tbody>
            </v-table>
          </div>
        </v-col>
      </v-row>
    </v-container>
  </div>
</template>

<script lang="ts" setup>
import { fetchAvailableStreams } from '../utils/fetchAvailableStreams';
import { onMounted, ref, onUnmounted, watch } from 'vue';
import { subscribeToEventStream } from '../utils/eventStream';
import NavBar from './NavBar.vue';

const availableStreams = ref<{ name: string; label?: string }[]>([]);
const selectedStream = ref('recentchange');
const events = ref<RecentChangeEvent[]>([]);
const maxEvents = ref(100);
const maxEventsInput = ref(maxEvents.value);
const samplePercent = ref(100); // Default to 100%
const samplePercentInput = ref(samplePercent.value);
const showFilterDialog = ref(false);
let eventStreamInstance: ReturnType<typeof subscribeToEventStream> | null = null;

// Type for recentchange event
interface RecentChangeEvent {
  id?: string | number;
  server_name?: string;
  title?: string;
  user?: string;
  comment?: string;
  timestamp?: string | number;
  [key: string]: unknown;
}

function applyFilter() {
  maxEvents.value = Math.max(1, Math.min(1000, maxEventsInput.value));
  samplePercent.value = Math.max(1, Math.min(100, samplePercentInput.value));
  showFilterDialog.value = false;
  // Trim events if needed
  if (events.value.length > maxEvents.value) {
    events.value.splice(maxEvents.value);
  }
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
  try {
    const streams = await fetchAvailableStreams();
    availableStreams.value = streams.map((name: string) => ({ name, label: name }));
    // If the current selectedStream is not in the new list, reset it
    if (!streams.includes(selectedStream.value)) {
      selectedStream.value = streams[0] || '';
    }
  } catch {
    // fallback to static list if fetch fails
    availableStreams.value = [
      { name: 'recentchange', label: 'Recent Changes' },
      { name: 'mediawiki.page-create', label: 'Page Create' },
      { name: 'mediawiki.revision-create', label: 'Revision Create' },
      { name: 'mediawiki.revision-restore', label: 'Revision Restore' },
      { name: 'mediawiki.revision-tags-change', label: 'Revision Tags Change' },
    ];
  }
}

onMounted(() => {
  loadAvailableStreams();
  startStream();
});

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
});
</script>

<style scoped>
/* Add any component-specific styles here */
</style>