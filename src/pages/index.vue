<template>
  <v-app-bar app>
    <v-spacer></v-spacer>
    <v-btn v-if="user" @click="logout">Logout</v-btn>
    <v-btn v-else @click="login">Login</v-btn>
  </v-app-bar>
  <Home />
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import { getUser, removeUser } from '../utils/storage';
import { generateCodeVerifier, generateCodeChallenge, redirectToAuth } from '../utils/oauth';

const user = ref(getUser());

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
</script>
