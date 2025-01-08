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

const user = ref(JSON.parse(localStorage.getItem('user') || 'null'));

function logout() {
  localStorage.removeItem('user');
  user.value = null;
  window.location.reload();
}

function login() {
  const codeVerifier = generateCodeVerifier();
  generateCodeChallenge(codeVerifier).then(codeChallenge => {
    localStorage.setItem('code_verifier', codeVerifier);

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });

    window.location.href = `${AUTH_URL}?${params.toString()}`;
  });
}

function generateCodeVerifier() {
  const array = new Uint8Array(32);
  window.crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

async function generateCodeChallenge(codeVerifier) {
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const hashed = await window.crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(hashed)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

const AUTH_URL = 'https://meta.wikimedia.org/w/rest.php/oauth2/authorize';
const CLIENT_ID = 'dbd8434c74f1997c7156deab168e8948';
const REDIRECT_URI = 'http://localhost:3000/auth/mediawiki/callback';
</script>
