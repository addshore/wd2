<template>
  <NavBar />
  <v-container>
    <v-row justify="center" align="center" style="height: 100vh;" v-if="!user">
      <h3>Welcome to the OAuth2 demo</h3>
    </v-row>
    <div v-if="user">
      <h3>Welcome, {{ user.username }}</h3>
      <p>Click on the buttons above to navigate to different pages</p>
      <p v-if="accessToken">
        <span v-if="editCount">You have made {{ editCount }} Wikidata edits! 🎉</span>
        <span v-else>Loading...</span>
      </p>
    </div>
  </v-container>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import { getAccessToken, getUser } from '../utils/storage';
import NavBar from '../components/NavBar.vue';

const user = ref(getUser());

const accessToken = ref(getAccessToken());
const editCount = ref(null);
if (accessToken) {
  fetch('https://www.wikidata.org/w/api.php?action=query&meta=userinfo&uiprop=editcount&format=json&formatversion=2&crossorigin=', {
    headers: {
      Authorization: `Bearer ${accessToken.value}`,
      'Content-Type': 'application/json',
    },
    method: 'POST',
  }).then(r => r.json()).then(r => {
    const { userinfo } = r.query;
    if (userinfo.name !== user.value.username) {
      console.warning(`Inconsistent user name! OAuth "${user.value.username}" != MediaWiki "${userinfo.name}"`, r);
      return;
    }
    editCount.value = r.query.userinfo.editcount;
  }).catch(e => {
    console.error('API request failed :( try logging out and back in again?', e);
  });
}

</script>
