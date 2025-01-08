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
import { getUser } from '../utils/storage';

export default {
  data() {
    return {
      user: getUser(),
    };
  },
};
</script>