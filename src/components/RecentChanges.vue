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
            <v-row>
                <v-col cols="3">
                    <v-row style="padding: 5px;">
                        <h4>Recent Changes ({{ events.length }}/{{ maxEvents }})</h4>
                        &nbsp;<v-btn @click="showFilterDialog = true" density="compact">
                                    <v-icon>mdi-cog</v-icon>
                        </v-btn>
                        <v-dialog v-model="showFilterDialog" max-width="500px">
                            <v-card>
                                <v-card-title>
                                    <span class="headline">Some Settings?</span>
                                </v-card-title>
                                <v-card-text>
                                    TODO
                                </v-card-text>
                                <v-card-actions>
                                    <v-spacer></v-spacer>
                                    <v-btn color="primary" @click="applyFilter">Apply</v-btn>
                                    <v-btn color="secondary" @click="showFilterDialog = false">Cancel</v-btn>
                                </v-card-actions>
                            </v-card>
                        </v-dialog>
                    </v-row>
                    <v-row>
                        <v-list>
                            <v-list-item v-for="event in events" :key="event.id" @click="selectEvent(event)">
                                <v-list-item-content>
                                    <v-list-item-title>{{ event.title }}</v-list-item-title>
                                    <v-list-item-subtitle>{{ event.user }}</v-list-item-subtitle>
                                </v-list-item-content>
                            </v-list-item>
                        </v-list>
                    </v-row>
                </v-col>
                <v-col cols="9">
                    <v-row>
                        <v-col>
                            <h3>Recent Changes</h3>
                        </v-col>
                    </v-row>
                    <div v-if="selectedEvent">
                        <div v-for="diff in selectedEvent.parsedDiffs" :key="diff.property">
                            TODO
                        </div>
                    </div>
                    <p v-else>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>
                </v-col>
            </v-row>
        </v-container>
    </div>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useTheme } from 'vuetify';
import { getUser, removeUser } from '../utils/storage';
import { generateCodeVerifier, generateCodeChallenge, redirectToAuth } from '../utils/oauth';
import { subscribeToRecentChanges, RecentChangeEvent } from '../utils/eventStream';
import { ApiClient, LabelsApi } from '@wmde/wikibase-rest-api';
import { CompareResult } from '../utils/diff';

const theme = useTheme();
function toggleTheme() {
    theme.global.name.value = theme.global.current.value.dark ? 'light' : 'dark';
}

const user = ref(getUser());
const router = useRouter();
const events = ref<RecentChangeEvent[]>([]);
const maxEvents = 100;
const showFilterDialog = ref(false);
const selectedEvent = ref<RecentChangeEvent | null>(null);

const apiClient = new ApiClient('https://www.wikidata.org/w/rest.php/wikibase/v1');
apiClient.defaultHeaders['User-Agent'] = window.navigator.userAgent;
const labelsApi = new LabelsApi(apiClient);

async function fetchLabel(qNumber: string): Promise<string | undefined> {
    try {
        return await labelsApi.getItemLabelWithFallback(qNumber, 'en');
    } catch {
        return undefined;
    }
}

async function fetchDiffUrl(oldRevId: number, newRevId: number): Promise<string | undefined> {
    const url = `https://www.wikidata.org/w/api.php?action=compare&fromrev=${oldRevId}&torev=${newRevId}&format=json&origin=*&difftype=unified`;
    try {
        const response = await fetch(url);
        if (response.ok) {
            const data: CompareResult = await response.json();
            return data.compare['*'];
        }
    } catch (error) {
        console.error('Error fetching diff URL:', error);
    }
    return undefined;
}

function parseDiffHtml(diffHtml: string): object[] {
    const parser = new DOMParser();
    const doc = parser.parseFromString("<html><body><table>" + diffHtml + "</table></body></html>", 'text/html');
    console.log(doc)
    const rows = doc.querySelectorAll('tr');
    const diffs: object[] = [];

    // TODO: Implement parsing of diff HTML

    return diffs;
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

function applyFilter() {
    showFilterDialog.value = false;
}

function selectEvent(event: RecentChangeEvent) {
    selectedEvent.value = event;
}

onMounted(() => {
    const recentChangeStream = subscribeToRecentChanges();

    let eventBuffer: RecentChangeEvent[] = [];

    recentChangeStream.onMessage(async (event) => {
        if (event.server_name !== "www.wikidata.org") {
            return;
        }
        if (event.namespace !== 0) {
            return;
        }
        const label = await fetchLabel(event.title);
        if (label !== undefined) {
            event.title = `${label} (${event.title})`;
        }
        if (event.revision.old !== null && event.revision.new !== null) {
            const diffHtml = await fetchDiffUrl(event.revision.old, event.revision.new);
            if (diffHtml) {
                event.parsedDiffs = parseDiffHtml(diffHtml);
                console.log(event.parsedDiffs)
            }
        }
        eventBuffer.push(event);
    });

    setInterval(() => {
        if (eventBuffer.length > 0) {
            // Add new events at the start of the array
            events.value.unshift(...eventBuffer);

            // Trim the events list if it exceeds the limit
            if (events.value.length > maxEvents) {
                events.value.splice(maxEvents);
            }

            // Clear the buffer
            eventBuffer = [];
        }
    }, 500);

    recentChangeStream.onError((error) => {
        console.error('Error in recent change stream:', error);
    });

    onUnmounted(() => {
        recentChangeStream.close();
    });
});
</script>