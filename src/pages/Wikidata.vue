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
          <v-text-field
            v-model="inputId"
            label="ID"
            @keyup.enter="loadItemById"
          ></v-text-field>
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
              <h3>{{ viewingItem }}</h3>
              <div v-if="activeTab === 0">TODO</div>
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

const user = ref(getUser());
const router = useRouter();
const theme = useTheme();
const drawer = ref(true);
const activeTab = ref(0);
const inputId = ref('');

const viewingItem = ref<string | null>(null);
const itemJson = ref<object | null>(null);
const wbgetentitiesJson = ref<object | null>(null);
const specialEntityDataPhp = ref<object | null>(null);
const specialEntityDataN3 = ref<object | null>(null);
const specialEntityDataTtl = ref<object | null>(null);
const specialEntityDataNt = ref<object | null>(null);
const specialEntityDataRdf = ref<object | null>(null);
const specialEntityDataJsonld = ref<object | null>(null);
const specialEntityDataHtml = ref<object | null>(null);

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

async function loadItemById() {
  if (inputId.value) {
    viewingItem.value = inputId.value;
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
  }

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

async function fetchLabel(qNumber: string): Promise<string | undefined> {
    try {
        return await labelsApi.getItemLabelWithFallback(qNumber, 'en');
    } catch {
        return undefined;
    }
}
});
</script>