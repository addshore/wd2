<template>
  <v-container>
    <v-row justify="center" align="center" style="height: 100vh;" v-if="!user">
      <h3>Welcome to the OAuth2 demo</h3>
    </v-row>
    <div v-if="user">
      <h3>Welcome, {{ user.username }}</h3>
    </div>
  </v-container>
</template>

<script>
const AUTH_URL = 'https://meta.wikimedia.org/w/rest.php/oauth2/authorize';
const CLIENT_ID = 'dbd8434c74f1997c7156deab168e8948';
const REDIRECT_URI = 'http://localhost:3000/auth/mediawiki/callback';

export default {
  data() {
    return {
      user: JSON.parse(localStorage.getItem('user')),
    };
  },
  methods: {
    logout() {
      localStorage.removeItem('user');
      this.user = null;
      window.location.reload();
    },
    generateCodeVerifier() {
      const array = new Uint8Array(32);
      window.crypto.getRandomValues(array);
      return btoa(String.fromCharCode(...array))
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
    },
    async generateCodeChallenge(codeVerifier) {
      const encoder = new TextEncoder();
      const data = encoder.encode(codeVerifier);
      const hashed = await window.crypto.subtle.digest('SHA-256', data);
      return btoa(String.fromCharCode(...new Uint8Array(hashed)))
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
    },
  },
};
</script>