<template>
  <cdx-dialog
    :open="show"
    title="Feed Settings"
    style="max-width: 500px;"
    @close="close"
  >
    <cdx-label
      for="feed-max-events"
      style="margin-bottom: 4px;"
    >
      Maximum number of entries
    </cdx-label>
    <cdx-text-input
      id="feed-max-events"
      type="number"
      min="1"
      max="1000"
      style="max-width: 200px; margin-bottom: 16px;"
      :model-value="localMaxEventsInput"
      @update:model-value="val => localMaxEventsInput = Number(val)"
      @keydown.enter="applyFilter"
    />
    <cdx-label
      for="feed-sample-percent"
      style="margin-bottom: 4px;"
    >
      Sample percent (%)
    </cdx-label>
    <cdx-text-input
      id="feed-sample-percent"
      type="number"
      min="1"
      max="100"
      style="max-width: 200px;"
      :model-value="localSamplePercentInput"
      @update:model-value="val => localSamplePercentInput = Number(val)"
      @keydown.enter="applyFilter"
    />
    <div style="margin-top: 24px; display: flex; gap: 8px; justify-content: flex-end;">
      <cdx-button
        action="progressive"
        @click="applyFilter"
      >
        Apply
      </cdx-button>
      <cdx-button
        action="default"
        @click="close"
      >
        Cancel
      </cdx-button>
    </div>
  </cdx-dialog>
</template>

<script lang="ts" setup>
import { ref, watch, defineProps, defineEmits } from 'vue';
import { CdxDialog, CdxButton, CdxTextInput } from '@wikimedia/codex';

const props = defineProps({
  show: Boolean,
  maxEventsInput: { type: Number, default: 100 },
  samplePercentInput: { type: Number, default: 100 },
});
const emit = defineEmits(['update:show', 'update:max-events-input', 'update:sample-percent-input', 'apply']);

const localMaxEventsInput = ref(props.maxEventsInput);
const localSamplePercentInput = ref(props.samplePercentInput);

watch(() => props.show, (val) => {
  if (val) {
    localMaxEventsInput.value = props.maxEventsInput;
    localSamplePercentInput.value = props.samplePercentInput;
  }
});

function close() {
  emit('update:show', false);
}
function applyFilter() {
  emit('update:max-events-input', localMaxEventsInput.value);
  emit('update:sample-percent-input', localSamplePercentInput.value);
  emit('apply');
  close();
}
</script>
