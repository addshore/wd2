<template>
  <v-container>
    <v-btn @click="login">Login with Wikimedia</v-btn>
    <div v-if="user">
      <h3>Welcome, {{ user.name }}</h3>
      <p>Your email: {{ user.email }}</p>
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
      user: null,
    };
  },
  methods: {
    async login() {
      const codeVerifier = this.generateCodeVerifier();
      const codeChallenge = await this.generateCodeChallenge(codeVerifier);

      localStorage.setItem('code_verifier', codeVerifier);

      const params = new URLSearchParams({
        response_type: 'code',
        client_id: CLIENT_ID,
        redirect_uri: REDIRECT_URI,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
      });

      window.location.href = `${AUTH_URL}?${params.toString()}`;
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