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
            @update:search="fetchSuggestions"
            @keyup.enter="loadItemFromInput"
          />
        </v-list-item>
        <v-list-item @click="reRenderRandomItem">
          <v-list-item-title>Random Item</v-list-item-title>
        </v-list-item>
      </v-list>
    </v-navigation-drawer>
    <v-container>
      <v-tabs v-model="activeTab">
        <v-tab>Entity</v-tab>
      </v-tabs>
      <v-tab-item>
        <v-card>
          <v-card-text>
            <h3 v-if="!viewingItem">Select an item to view</h3>
            <div v-if="viewingItem">
              <div v-if="activeTab === 0">
                <v-row>
                  <v-col cols="8">
                    <h2>{{ viewingItem }}</h2>
                    <a :href="'https://www.wikidata.org/wiki/' + viewingItem" target="_blank">Wikidata</a>,
                    <a :href="'https://www.wikidata.org/w/rest.php/wikibase/v1/entities/items/' + viewingItem " target="_blank">REST API</a>,
                    <a :href="'https://www.wikidata.org/w/api.php?action=wbgetentities&ids=' + viewingItem " target="_blank">Action API</a>,
                    <a :href="'https://www.wikidata.org/wiki/Special:EntityData/' + viewingItem + '.json'" target="_blank">Entity Data</a>,
                    <a :href="'https://reasonator.toolforge.org/?q=' + viewingItem" target="_blank">Reasonator</a>
                    <!-- select * where {wd:Q123 ?b ?c} -->
                    <h2>Terms</h2>
                    <v-data-table density="compact"  :items="terms" hide-default-header hide-default-footer></v-data-table>
                    <h2>Sitelinks</h2>
                    <v-data-table density="compact" :items="sitelinks" hide-default-header hide-default-footer></v-data-table>
                    <h2>Statements</h2>
                    <v-data-table density="compact" :items="statements" hide-default-header hide-default-footer></v-data-table>
                  </v-col>
                  <v-col cols="4">
                  </v-col>
                </v-row>
              </div>
            </div>
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

const drawer = ref(true);
const activeTab = ref(0);
const inputId = ref('');
const search = ref('');
const suggestions = ref<string[]>([]);
const loading = ref(false);

const viewingItem = ref<string | null>(null);
const itemJson = ref<any | null>(null);
const badgeLabels = ref<Map<string, string>>(new Map());

const apiClient = new ApiClient('https://www.wikidata.org/w/rest.php/wikibase');
const itemsApi = new ItemsApi(apiClient);
const labelsApi = new LabelsApi(apiClient);

const terms = ref([]);
const sitelinks = ref([]);
const statements = ref([]);

async function reRenderRandomItem() {
  const item = await randomItem();
  if (item) {
    viewingItem.value = item;
    inputId.value = item;
  }
}

async function randomItem(): Promise<string | undefined> {
    const url = `https://www.wikidata.org/w/api.php?action=query&list=random&rnnamespace=0&rnlimit=1&format=json&format=json&origin=*`;
    try {
        const response = await fetch(url);
        if (response.ok) {
            const data = await response.json();
            return data.query.random[0].title;
        }
    } catch (error) {
        console.error('Error fetching random page:', error);
    }
}

async function loadItemFromInput() {
  console.log('loadItemFromInput', inputId.value);
  if (inputId.value) {
    // this is either just an ID, or Q123 - Label (Description)
    const match = inputId.value.match(/Q\d+/);
    const id = match ? match[0] : inputId.value;
    viewingItem.value = id
    inputId.value = id;
  }
}

watch(viewingItem, async (newItem) => {
  if (newItem) {
    const json = await itemsApi.getItem(newItem);
    itemJson.value = json;

    // Update terms
    terms.value = Object.keys({ ...itemJson.value.labels, ...itemJson.value.descriptions }).map(lang => ({
      language: lang,
      label: itemJson.value.labels[lang],
      description: itemJson.value.descriptions[lang] || '',
      aliases: (itemJson.value.aliases[lang] || []).join(', ')
    }));

    // Update sitelinks
    sitelinks.value = Object.entries(itemJson.value.sitelinks || {}).map(([site, sitelink]) => ({
      site,
      title: sitelink.title,
      url: sitelink.url,
      badges: sitelink.badges.map(badge => getBadgeLabel(badge)).join(', ')
    }));

    // Fetch the JSON for the currently selected item from wbgetentities
    const wbgetentitiesUrl = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${newItem}&format=json&origin=*`;
    try {
      const response = await fetch(wbgetentitiesUrl);
      if (response.ok) {
        wbgetentitiesJson.value = (await response.json()).entities[newItem];
      } else {
        wbgetentitiesJson.value = { error: 'Failed to fetch item JSON' };
      }
    } catch (error) {
      wbgetentitiesJson.value = { error: 'Error fetching item JSON' };
    }

    // Fetch special entity data
    const formats = ['ttl', 'nt', 'rdf', 'jsonld'];
    for (const format of formats) {
      await fetchSpecialEntityData(newItem, format);
    }

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
  } else {
    itemJson.value = null;
    terms.value = [];
    sitelinks.value = [];
    badgeLabels.value.clear();
  }
});

const fetchSuggestions = async (query: string) => {
  if (query.length === 0 ) {
    suggestions.value = [];
    return;
  }
  loading.value = true;
  const url = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${query}&format=json&errorformat=plaintext&language=en&uselang=en&type=item&origin=*`;
  try {
    const response = await fetch(url);
    if (response.ok) {
      const data = await response.json();
      suggestions.value = data.search.map((item: any) => `${item.id} - ${item.label} (${item.description})`);
    } else {
      suggestions.value = [];
    }
  } catch (error) {
    console.error('Error fetching suggestions:', error);
    suggestions.value = [];
  } finally {
    loading.value = false;
  }
};

watch(search, debounce(fetchSuggestions, 100));

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