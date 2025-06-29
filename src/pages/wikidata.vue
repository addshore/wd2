<template>
  <NavBar />
  <div class="wikidata-page">
    <div class="wikidata-controls">
      <CdxButton @click="loadRandomItem">
        Random Item
      </CdxButton>
      <CdxTypeaheadSearch
        id="wikidata-typeahead"
        v-model="inputId"
        form-action="javascript:void(0)"
        :search-results="searchResults"
        :search-footer-url="searchFooterUrl"
        :highlight-query="true"
        :visible-item-limit="5"
        placeholder="Search Wikidata"
        :loading="searchLoading"
        style="max-width: 300px;"
        :use-button="false"
        @input="onInput"
        @search-result-click="onSearchResultClick"
        @submit="onSubmit"
        @load-more="onLoadMore"
      >
        <template #default>
          <input type="hidden" name="language" value="en">
          <input type="hidden" name="title" value="Special:Search">
        </template>
        <template #search-footer-text="{ searchQuery }">
          Search Wikidata for pages containing
          <strong class="cdx-typeahead-search__search-footer__query">
            {{ searchQuery }}
          </strong>
        </template>
      </CdxTypeaheadSearch>
    </div>
    <v-container v-if="itemId">
      <template v-if="itemData === null">
        <div style="display: flex; justify-content: center; align-items: center; min-height: 200px;">
          <v-progress-circular indeterminate color="primary" size="48" />
        </div>
      </template>
      <template v-else>
        <h2>Terms</h2>
        <CdxTable
          :columns="[
            { id: 'language', label: 'Language' },
            { id: 'label', label: 'Label' },
            { id: 'description', label: 'Description' },
            { id: 'aliases', label: 'Aliases' }
          ]"
          :data="itemData.terms || []"
          :hide-caption="true"
        />
        <h2>Sitelinks</h2>
        <CdxTable
          :columns="[
            { id: 'site', label: 'Site' },
            { id: 'title', label: 'Title' },
            { id: 'badges', label: 'Badges' }
          ]"
          :data="(itemData.sitelinks || []).map(s => ({
            ...s,
            title: s.url ? `<a href='${s.url}' target='_blank'>${s.title} 🔗</a>` : s.title,
            badges: s.badges && s.badges.length ? s.badges.map(b => `<a href='${b.url}' target='_blank'>${b.label}</a>`).join(', ') : ''
          }))"
          :allow-html="true"
          :hide-caption="true"
        />
        <h2>Statements</h2>
        <div v-for="(statements, property) in itemData.statements" :key="property">
          <h3>{{ property }}</h3>
          <CdxTable
            :columns="[
              { id: 'id', label: 'ID' },
              { id: 'rank', label: 'Rank' },
              { id: 'value', label: 'Value' }
            ]"
            :data="(statements || []).map(s => ({
              id: s.id,
              rank: s.rank,
              value: s.value && s.value.content ? s.value.content : ''
            }))"
            :hide-caption="true"
          />
        </div>
        <h2>Links</h2>
        <a
          :href="'https://www.wikidata.org/wiki/' + itemId"
          target="_blank"
        >Wikidata</a>,
        <a
          :href="'https://www.wikidata.org/w/rest.php/wikibase/v1/entities/items/' + itemId"
          target="_blank"
        >REST API</a>,
        <a
          :href="'https://www.wikidata.org/w/api.php?action=wbgetentities&ids=' + itemId"
          target="_blank"
        >Action API</a>,
        <a
          :href="'https://www.wikidata.org/wiki/Special:EntityData/' + itemId + '.json'"
          target="_blank"
        >Entity Data</a>,
        <a
          :href="'https://reasonator.toolforge.org/?q=' + itemId"
          target="_blank"
        >Reasonator</a>
      </template>
    </v-container>
  </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import NavBar from '../components/NavBar.vue';
import Wikibase from '../utils/wikibase';
import { CdxButton, CdxTypeaheadSearch, CdxTable } from '@wikimedia/codex';

const inputId = ref('');
const searchResults = ref<any[]>([]);
const searchFooterUrl = ref('');
const currentSearchTerm = ref('');
const itemId = ref<string | null>(null);
const searchLoading = ref(false);

interface Term {
  language: string;
  label: string;
  description: string;
  aliases: string;
}
interface SitelinkBadge {
  id: string;
  label: string;
  url: string;
}
interface Sitelink {
  site: string;
  title: string;
  url: string;
  badges: SitelinkBadge[];
}
interface Statement {
  id: string;
  rank: string;
  qualifiers: any[];
  references: any[];
  property: {
    id: string;
    data_type: string;
  };
  value: {
    type: string;
    content: string;
  };
}
interface ItemData {
  terms: Term[];
  sitelinks: Sitelink[];
  statements: { [property: string]: Statement[] };
}

const itemData = ref<ItemData | null>(null);
const wikidata = new Wikibase('https://www.wikidata.org/w/');

async function loadRandomItem() {
  const item = await wikidata.randomItem();
  if (item) {
    inputId.value = item;
    loadItemData(item);
  }
}

async function loadItemData(id: string) {
  itemId.value = id;
  itemData.value = null;
  const data = await wikidata.loadItemData(id);
  itemData.value = data;
}

async function onInput(value: string) {
  currentSearchTerm.value = value;
  if (!value || value === '') {
    searchResults.value = [];
    searchFooterUrl.value = '';
    return;
  }
  searchLoading.value = true;
  try {
    const data = await wikidata.fetchItemSuggestions(value);
    if (currentSearchTerm.value === value) {
      searchResults.value = data.suggestions && data.suggestions.length > 0 ? data.suggestions : [];
      searchFooterUrl.value = `https://www.wikidata.org/w/index.php?search=${encodeURIComponent(value)}&title=Special%3ASearch&fulltext=1`;
    }
  } catch {
    searchResults.value = [];
    searchFooterUrl.value = '';
  }
  searchLoading.value = false;
}

async function onLoadMore() {
  if (!currentSearchTerm.value) return;
  // fetchItemSuggestions does not support offset, so just return
}

function onSearchResultClick(value: any) {
  const id = value.searchResult.value
  inputId.value = id;
  loadItemData(id);
}

function onSubmit(value: any, event?: Event) {
  if (event) event.preventDefault();
  // If there are search results, select the top one
  if (searchResults.value.length > 0) {
    const topResult = searchResults.value[0];
    if (topResult && topResult.value) {
      inputId.value = topResult.value;
      loadItemData(topResult.value);
      return;
    }
  }
}
</script>

<style scoped>
.wikidata-page {
  padding: 24px;
  min-height: 100vh;
  box-sizing: border-box;
}
.wikidata-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  max-width: 420px;
  margin-bottom: 16px;
}
.outlined-row {
  border: 1px solid #494949;
}
.no-underline {
  text-decoration: none;
}
</style>