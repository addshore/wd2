<template>
  <v-app-bar app>
    <!-- <v-btn @click="toggleDrawer">Menu</v-btn> -->
    <v-btn @click="goToHome">Home</v-btn>
    <v-btn @click="goToWikidata">Wikidata</v-btn>
    <v-btn @click="goToEventStream">EventStream</v-btn>
    <v-btn @click="goToWikibaseWorld">Wikibase World</v-btn>
    <v-spacer></v-spacer>
    <v-btn @click="toggleTheme">Light / Dark</v-btn>
    <v-btn v-if="user" @click="logout">Logout</v-btn>
    <v-btn v-else @click="login">Login</v-btn>
  </v-app-bar>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useTheme } from 'vuetify';
import { getUser, removeUser } from '../utils/storage';
import { generateCodeVerifier, generateCodeChallenge, redirectToAuth } from '../utils/oauth';
import { setCodexTheme } from '../utils/codexTheme';

const user = ref(getUser());
const router = useRouter();
const theme = useTheme();

function toggleTheme() {
  const isDark = theme.global.current.value.dark;
  const newTheme = isDark ? 'light' : 'dark';
  theme.global.name.value = newTheme;
  setCodexTheme(newTheme);
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

function goToEventStream() {
  router.push('/eventstream');
}

function goToWikibaseWorld() {
  router.push('/wikibases');
}

// On mount, sync Codex theme with current Vuetify theme
setCodexTheme(theme.global.name.value);
</script>
