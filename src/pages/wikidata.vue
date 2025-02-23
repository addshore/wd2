<template>
  <div>
    <NavBar />
    <v-navigation-drawer v-model="drawer" app>
      <v-list>
        <v-list-item>
          <v-autocomplete
            v-model="inputId"
            :items="suggestions"
            menu-icon=""
            placeholder="Search Item"
            auto-select-first
            item-props
            @update:search="updateSuggestions"
            @keyup.enter="handleEnter"
          />
        </v-list-item>
        <v-list-item @click="newTabRandomItem">
          <v-list-item-title>Random Item</v-list-item-title>
        </v-list-item>
      </v-list>
    </v-navigation-drawer>
    <v-container>
      <v-tabs v-model="activeTab">
      <v-tab v-for="(tab, index) in tabs" :key="index">
        {{ tab }}
        <v-btn icon density="compact" @click.stop="closeTab(index)">
        <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-tab>
      <v-tab @click="addNewTab">+</v-tab>
      </v-tabs>
      <v-tab-item v-for="(tab, index) in tabs" :key="index">
      <v-card v-if="activeTab === index">
        <v-card-text>
        <h2>Terms</h2>
        <v-data-table density="compact" :items="terms" hide-default-header hide-default-footer></v-data-table>
        <h2>Sitelinks</h2>
        <v-data-table density="compact" :items="sitelinks" hide-default-header hide-default-footer></v-data-table>
        <h2>Statements</h2>
        <v-data-table density="compact" :items="statements" hide-default-header hide-default-footer></v-data-table>
        <h2>Links</h2>
        <a :href="'https://www.wikidata.org/wiki/' + tab" target="_blank">Wikidata</a>,
        <a :href="'https://www.wikidata.org/w/rest.php/wikibase/v1/entities/items/' + tab" target="_blank">REST API</a>,
        <a :href="'https://www.wikidata.org/w/api.php?action=wbgetentities&ids=' + tab" target="_blank">Action API</a>,
        <a :href="'https://www.wikidata.org/wiki/Special:EntityData/' + tab + '.json'" target="_blank">Entity Data</a>,
        <a :href="'https://reasonator.toolforge.org/?q=' + tab" target="_blank">Reasonator</a>
        </v-card-text>
      </v-card>
      </v-tab-item>
    </v-container>
  </div>
</template>

<script lang="ts" setup>
import { ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useTheme } from 'vuetify';
import { getUser, removeUser } from '../utils/storage';
import { generateCodeVerifier, generateCodeChallenge, redirectToAuth } from '../utils/oauth';
import { ApiClient, LabelsApi, ItemsApi } from '@wmde/wikibase-rest-api';
import { debounce } from 'lodash';
import NavBar from '../components/NavBar.vue';
import Wikibase from '../utils/wikibase';

const drawer = ref(true);
const activeTab = ref(0);
const inputId = ref('');
const search = ref('');
const suggestions = ref<string[]>([]);

const tabs = ref<string[]>([]);
const itemJson = ref<any | null>(null);
const badgeLabels = ref<Map<string, string>>(new Map());

const apiClient = new ApiClient('https://www.wikidata.org/w/rest.php/wikibase');
const itemsApi = new ItemsApi(apiClient);
const labelsApi = new LabelsApi(apiClient);

interface Term {
  language: string;
  label: string;
  description: string;
  aliases: string;
}
const terms = ref<Term[]>([]);

interface Sitelink {
  site: string;
  title: string;
  url: string;
  badges: string;
}
const sitelinks = ref<Sitelink[]>([]);

// TODO type
const statements = ref<any[]>([]);

const termsMap = ref<Map<string, any[]>>(new Map());
const sitelinksMap = ref<Map<string, any[]>>(new Map());
const statementsMap = ref<Map<string, any[]>>(new Map());

const wikidata = new Wikibase('https://www.wikidata.org/w/api.php');

const updateSuggestions = async (query: string) => {
  const result = await wikidata.fetchItemSuggestions(query);
  if (result.error) {
    console.error(result.error);
    suggestions.value = [];
  } else {
    suggestions.value = result.suggestions;
  }
};

async function newTabRandomItem() {
  const item = await wikidata.randomItem();
  if (item) {
    addItemToTabs(item);
  }
}

function handleEnter(event: KeyboardEvent) {
  if (event.ctrlKey) {
    addItemToTabs(inputId.value);
  } else {
    loadItemFromInput();
  }
}

async function loadItemFromInput() {
  console.log('loadItemFromInput', inputId.value);
  if (inputId.value) {
    const match = inputId.value.match(/Q\d+/);
    const id = match ? match[0] : inputId.value;
    addItemToTabs(id);
  }
}

function addItemToTabs(item: string) {
  if (!tabs.value.includes(item)) {
    tabs.value.push(item);
  }
  activeTab.value = tabs.value.indexOf(item);

  // Ensure the content is displayed when the first tab is loaded
  if (tabs.value.length === 1) {
    loadItemData(item);
  }
}

function addNewTab() {
  const newTab = `New Tab ${tabs.value.length + 1}`;
  tabs.value.push(newTab);
  activeTab.value = tabs.value.length - 1;
}

function closeTab(index: number) {
  const closedItem = tabs.value[index];
  tabs.value.splice(index, 1);

  // Adjust selected tab
  if (index <= activeTab.value) {
    activeTab.value = activeTab.value - 1;
  }
  if (activeTab.value < 0) {
    activeTab.value = 0;
  }

  // Remove data from maps if no tabs are open for the item
  if (!tabs.value.includes(closedItem)) {
    termsMap.value.delete(closedItem);
    sitelinksMap.value.delete(closedItem);
    statementsMap.value.delete(closedItem);
  }
}

watch(activeTab, async (newTabIndex) => {
  const newItem = tabs.value[newTabIndex];
  if (!newItem) {
    itemJson.value = null;
    terms.value = [];
    sitelinks.value = [];
    badgeLabels.value.clear();
    statements.value = [];
    return;
  }

  loadItemData(newItem);
});

async function loadItemData(item: string) {
  if (!termsMap.value.has(item) || !sitelinksMap.value.has(item) || !statementsMap.value.has(item)) {
    const json = await itemsApi.getItem(item);
    itemJson.value = json;

    // Update terms
    const terms = Object.keys({ ...itemJson.value.labels, ...itemJson.value.descriptions }).map(lang => ({
      language: lang,
      label: itemJson.value.labels[lang],
      description: itemJson.value.descriptions[lang] || '',
      aliases: (itemJson.value.aliases[lang] || []).join(', ')
    }));
    termsMap.value.set(item, terms);

    // Update sitelinks
    const sitelinks = Object.entries(itemJson.value.sitelinks || {}).map(([site, sitelink]) => ({
      site,
      title: sitelink.title,
      url: sitelink.url,
      badges: sitelink.badges.map(badge => getBadgeLabel(badge)).join(', ')
    }));
    sitelinksMap.value.set(item, sitelinks);

    // Fetch badge labels
    const badges = new Set<string>();
    for (const sitelink of Object.values(itemJson.value.sitelinks || {})) {
      for (const badge of sitelink.badges) {
        badges.add(badge);
      }
    }
    for (const badge of badges) {
      const label = await fetchLabel(badge);
      if (label) {
        badgeLabels.value.set(badge, label);
      }
    }

    // Update statements
    const statements = itemJson.value.claims || [];
    statementsMap.value.set(item, statements);
  }

  terms.value = termsMap.value.get(item) || [];
  sitelinks.value = sitelinksMap.value.get(item) || [];
  statements.value = statementsMap.value.get(item) || [];
}

watch(search, debounce(updateSuggestions, 100));

async function fetchLabel(qNumber: string): Promise<string | undefined> {
    try {
        return await labelsApi.getItemLabelWithFallback(qNumber, 'en');
    } catch {
        return undefined;
    }
}

function getBadgeLabel(badge: string): string {
  return badgeLabels.value.get(badge) || badge;
}
</script>

<style scoped>
.outlined-row {
  border: 1px solid #494949;
}
</style>