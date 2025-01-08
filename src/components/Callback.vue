<template>
    <v-container>
      <h3 v-if="user">Welcome back, {{ user.username }}</h3>
      <p v-else-if="error">{{ error }}</p>
      <p v-else>Loading...</p>
    </v-container>
  </template>
  
  <script>
  const TOKEN_URL = 'https://meta.wikimedia.org/w/rest.php/oauth2/access_token';
  const CLIENT_ID = 'dbd8434c74f1997c7156deab168e8948';
  const REDIRECT_URI = 'http://localhost:3000/auth/mediawiki/callback';
  
  export default {
    data() {
      return {
        user: null,
        error: null,
      };
    },
    async mounted() {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const codeVerifier = localStorage.getItem('code_verifier');
  
      if (code && codeVerifier) {
        try {
          const tokenResponse = await fetch(TOKEN_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              grant_type: 'authorization_code',
              client_id: CLIENT_ID,
              code,
              redirect_uri: REDIRECT_URI,
              code_verifier: codeVerifier,
              code_challenge_method: 'S256',
            }),
          });
  
          if (!tokenResponse.ok) {
            const errorData = await tokenResponse.json();
            throw new Error(errorData.error_description || 'Failed to fetch token');
          }
  
          const tokenData = await tokenResponse.json();
          const userResponse = await fetch('https://meta.wikimedia.org/w/rest.php/oauth2/resource/profile', {
            headers: {
              Authorization: `Bearer ${tokenData.access_token}`,
            },
          });
  
          this.user = await userResponse.json();
        } catch (error) {
          this.error = error.message;
        }
      } else {
        this.error = 'Code or code verifier is missing';
      }
    },
  };
  </script>
