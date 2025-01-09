<template>
  <v-app-bar app>
    <v-btn @click="goToHome">Home</v-btn>
    <v-btn @click="goToWikidata">Wikidata</v-btn>
    <v-btn @click="goToRecentChanges">RecentChanges</v-btn>
    <v-spacer></v-spacer>
    <v-btn @click="toggleTheme">Light / Dark</v-btn>
    <v-btn v-if="user" @click="logout">Logout</v-btn>
    <v-btn v-else @click="login">Login</v-btn>
  </v-app-bar>
  <v-container>
    <v-row justify="center" align="center" style="height: 100vh;" v-if="!user">
      <h3>Welcome to the OAuth2 demo</h3>
    </v-row>
    <div v-if="user">
      <h3>Welcome, {{ user.username }}</h3>
      <p>Click on the buttons above to navigate to different pages</p>
      <p>This is an app, that does stufff...</p>
    </div>
  </v-container>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useTheme } from 'vuetify';
import { getUser, removeUser } from '../utils/storage';
import { generateCodeVerifier, generateCodeChallenge, redirectToAuth } from '../utils/oauth';

const user = ref(getUser());
const router = useRouter();
const theme = useTheme();

function toggleTheme() {
  theme.global.name.value = theme.global.current.value.dark ? 'light' : 'dark';
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
</script>
