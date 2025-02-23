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
        <v-data-table density="compact" :items="itemsMap.get(tab)?.terms" hide-default-header hide-default-footer :items-per-page="itemsMap.get(tab)?.terms.length || 0"></v-data-table>
        <h2>Sitelinks</h2>
        <v-data-table density="compact" :items="itemsMap.get(tab)?.sitelinks" hide-default-header hide-default-footer :items-per-page="itemsMap.get(tab)?.sitelinks.length || 0">
          <template v-slot:item.title="{ item }">
            {{ item.title }} <a :href="item.url" target="_blank" class="no-underline">🔗</a>
          </template>
          <template v-slot:item.url="{ item }"></template>
          <template v-slot:item.badges="{ item }">
            <v-chip v-for="badge in item.badges" :key="badge.id" outlined class="outlined-row">
              <a :href="badge.url" target="_blank" class="no-underline">{{ badge.label }}</a>
            </v-chip>
          </template>
        </v-data-table>
        <h2>Statements</h2>
        <div v-for="(statements, property) in itemsMap.get(tab)?.statements" :key="property">
          <h3>{{ property }}</h3>
          <v-data-table density="compact" :items="statements" hide-default-header hide-default-footer :items-per-page="statements.length || 0"></v-data-table>
        </div>
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

interface Term {
  language: string;
  label: string;
  description: string;
  aliases: string;
}
interface Sitelink {
  site: string;
  title: string;
  url: string;
  badges: SitelinkBadge[];
}
interface SitelinkBadge {
  id: string;
  label: string; // TODO make this a term? or set of terms?!
  url: string;
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

const itemsMap = ref<Map<string, ItemData>>(new Map());

const wikidata = new Wikibase('https://www.wikidata.org/w/');

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

  // Remove data from map if no tabs are open for the item
  if (!tabs.value.includes(closedItem)) {
    itemsMap.value.delete(closedItem);
  }
}

watch(activeTab, async (newTabIndex) => {
  const newItem = tabs.value[newTabIndex];
  if (!newItem) {
    itemJson.value = null;
    return;
  }

  loadItemData(newItem);
});

async function loadItemData(item: string) {
  const data = await wikidata.loadItemData(item);
  itemsMap.value.set(item, data);
}

watch(search, debounce(updateSuggestions, 100));
</script>

<style scoped>
.outlined-row {
  border: 1px solid #494949;
}

.no-underline {
  text-decoration: none;
}
</style>