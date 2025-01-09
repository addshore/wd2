<template>
  <div>
    <v-app-bar app>
      <!-- <v-btn @click="toggleDrawer">Menu</v-btn> -->
      <v-btn @click="goToHome">Home</v-btn>
      <v-btn @click="goToWikidata">Wikidata</v-btn>
      <v-btn @click="goToRecentChanges">RecentChanges</v-btn>
      <v-spacer></v-spacer>
      <v-btn @click="toggleTheme">Light / Dark</v-btn>
      <v-btn v-if="user" @click="logout">Logout</v-btn>
      <v-btn v-else @click="login">Login</v-btn>
    </v-app-bar>
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
        <v-tab>HTML</v-tab>
        <v-tab>REST API</v-tab>
        <v-tab>ACTION API</v-tab>
        <!-- <v-tab>PHP</v-tab> -->
        <!-- <v-tab>N3</v-tab> -->
        <v-tab>TTL</v-tab>
        <v-tab>NT</v-tab>
        <v-tab>RDF</v-tab>
        <v-tab>JSONLD</v-tab>
      </v-tabs>
      <v-tab-item>
        <v-card>
          <v-card-text>
            <h3 v-if="!viewingItem">Select an item to view</h3>
            <div v-if="viewingItem">
              <div v-if="activeTab === 0">
                <h2>Labels</h2>
                <v-col no-gutters>
                  <v-row no-gutters>
                    <v-col cols="12" md="1">
                      <h4>Language</h4>
                    </v-col>
                    <v-col cols="12" md="3">
                      <h4>Label</h4>
                    </v-col>
                    <v-col cols="12" md="4">
                      <h4>Description</h4>
                    </v-col>
                    <v-col cols="12" md="2">
                      <h4>Aliases</h4>
                    </v-col>
                  </v-row>
                  <v-row no-gutters v-for="lang in Object.keys({ ...itemJson?.labels, ...itemJson?.descriptions })" :key="lang">
                    <v-col cols="12" md="1">
                      <span>{{ lang }}</span>
                    </v-col>
                    <v-col cols="12" md="3">
                      <span>{{ itemJson.labels[lang] }}</span>
                    </v-col>
                    <v-col cols="12" md="4">
                      <span>{{ itemJson.descriptions[lang] || '' }}</span>
                    </v-col>
                    <v-col cols="12" md="2">
                      <div v-for="alias in itemJson.aliases[lang] || []" :key="alias">
                        <span>{{ alias }}</span>
                      </div>
                    </v-col>
                  </v-row>
                </v-col>
                <h2>Sitelinks</h2>
                <v-col no-gutters>
                  <v-row no-gutters>
                    <v-col cols="12" md="3">
                      <h4>Site</h4>
                    </v-col>
                    <v-col cols="12" md="7">
                      <h4>Title</h4>
                    </v-col>
                  </v-row>
                  <v-row no-gutters v-for="(sitelink, site) in itemJson?.sitelinks" :key="site">
                    <v-col cols="12" md="3">
                      <span>{{ site }}</span>
                    </v-col>
                    <v-col cols="12" md="7">
                      <a :href="sitelink.url" target="_blank">{{ sitelink.title }}</a>
                      <v-chip v-for="badge in sitelink.badges" :key="badge" color="primary" class="ma-2">
                        {{ getBadgeLabel(badge) }}
                      </v-chip>
                    </v-col>
                  </v-row>
                </v-col>
              </div>
              <pre v-else-if="activeTab === 1">{{ itemJson }}</pre>
              <pre v-else-if="activeTab === 2">{{ wbgetentitiesJson }}</pre>
              <!-- <pre v-else-if="activeTab === 3">{{ specialEntityDataPhp }}</pre> -->
              <!-- <pre v-else-if="activeTab === 4">{{ specialEntityDataN3 }}</pre> -->
              <pre v-else-if="activeTab === 3">{{ specialEntityDataTtl }}</pre>
              <pre v-else-if="activeTab === 4">{{ specialEntityDataNt }}</pre>
              <pre v-else-if="activeTab === 5">{{ specialEntityDataRdf }}</pre>
              <pre v-else-if="activeTab === 6">{{ specialEntityDataJsonld }}</pre>
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

const user = ref(getUser());
const router = useRouter();
const theme = useTheme();
const drawer = ref(true);
const activeTab = ref(0);
const inputId = ref('');
const search = ref('');
const suggestions = ref<string[]>([]);
const loading = ref(false);

const viewingItem = ref<string | null>(null);
const itemJson = ref<any | null>(null);
const wbgetentitiesJson = ref<object | null>(null);
const specialEntityDataPhp = ref<object | null>(null);
const specialEntityDataN3 = ref<object | null>(null);
const specialEntityDataTtl = ref<object | null>(null);
const specialEntityDataNt = ref<object | null>(null);
const specialEntityDataRdf = ref<object | null>(null);
const specialEntityDataJsonld = ref<object | null>(null);
const specialEntityDataHtml = ref<object | null>(null);
const badgeLabels = ref<Map<string, string>>(new Map());

const apiClient = new ApiClient('https://www.wikidata.org/w/rest.php/wikibase/v1');
const itemsApi = new ItemsApi(apiClient);
const labelsApi = new LabelsApi(apiClient);

function toggleTheme() {
  theme.global.name.value = theme.global.current.value.dark ? 'light' : 'dark';
    return undefined;
}

function logout() {
  removeUser();
  user.value = null;
  window.location.reload();
}

function login() {
  const codeVerifier = generateCodeVerifier();
  generateCodeChallenge(codeVerifier).then(codeChallenge => {
    redirectToAuth(codeChallenge, codeVerifier);
  });
}

function goToHome() {
  router.push('/');
}

function goToWikidata() {
  router.push('/wikidata');
}

function goToRecentChanges() {
  router.push('/recentchanges');
}

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
    wbgetentitiesJson.value = null;
    specialEntityDataPhp.value = null;
    specialEntityDataN3.value = null;
    specialEntityDataTtl.value = null;
    specialEntityDataNt.value = null;
    specialEntityDataRdf.value = null;
    specialEntityDataJsonld.value = null;
    specialEntityDataHtml.value = null;
    badgeLabels.value.clear();
  }
});

async function fetchSpecialEntityData(itemId: string, format: string) {
  const url = `https://www.wikidata.org/wiki/Special:EntityData/${itemId}.${format}`;
  try {
    const response = await fetch(url);
    if (response.ok) {
      switch (format) {
        case 'ttl':
          specialEntityDataTtl.value = await response.text();
          break;
        case 'nt':
          specialEntityDataNt.value = await response.text();
          break;
        case 'rdf':
          specialEntityDataRdf.value = await response.text();
          break;
        case 'jsonld':
          specialEntityDataJsonld.value = await response.text();
          break;
      }
    } else {
      setSpecialEntityDataError(format, 'Failed to fetch item data');
    }
  } catch (error) {
    setSpecialEntityDataError(format, 'Error fetching item data');
  }
}

function setSpecialEntityDataError(format: string, errorMessage: string) {
  switch (format) {
    case 'ttl':
      specialEntityDataTtl.value = { error: errorMessage };
      break;
    case 'nt':
      specialEntityDataNt.value = { error: errorMessage };
      break;
    case 'rdf':
      specialEntityDataRdf.value = { error: errorMessage };
      break;
    case 'jsonld':
      specialEntityDataJsonld.value = { error: errorMessage };
      break;
  }
}

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