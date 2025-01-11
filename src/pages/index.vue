<template>
  <NavBar />
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
import { getUser } from '../utils/storage';
import NavBar from '../components/NavBar.vue';

const user = ref(getUser());

</script>
