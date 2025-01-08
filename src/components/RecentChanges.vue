<template>
    <div>
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
            <h3>Recent Changes</h3>
            <div v-for="event in events" :key="event.id">
                <p>{{ event.title }}</p>
            </div>
        </v-container>
    </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useTheme } from 'vuetify';
import { getUser, removeUser } from '../utils/storage';
import { generateCodeVerifier, generateCodeChallenge, redirectToAuth } from '../utils/oauth';
import { subscribeToRecentChanges, RecentChangeEvent } from '../utils/eventStream';

const theme = useTheme();
function toggleTheme() {
    theme.global.name.value = theme.global.current.value.dark ? 'light' : 'dark';
}

const user = ref(getUser());
const router = useRouter();
const events = ref<RecentChangeEvent[]>([]);

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

onMounted(() => {
    const recentChangeStream = subscribeToRecentChanges();

    recentChangeStream.onMessage((event) => {
        events.value.unshift(event);
        if (events.value.length > 10000) {
            events.value = events.value.slice(0, 10000);
        }
    });

    recentChangeStream.onError((error) => {
        console.error('Error in recent change stream:', error);
    });

    onUnmounted(() => {
        recentChangeStream.close();
    });
});
</script>
