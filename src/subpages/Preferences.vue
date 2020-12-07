<template>
    <v-app>
        <v-tabs align-with-title background-color="primary" centered dark>
            <v-tab>Options</v-tab>
            <v-tab>Infos perso</v-tab>

            <v-tab-item>
                <v-card flat>
                    <v-card-text>
                        <v-row>
                            <v-switch
                                v-model="pref.minimize"
                                label="Minimiser l'app à la fermeture"
                                color="primary"
                                hide-details
                            ></v-switch>
                        </v-row>
                        <v-row>
                            <v-switch
                                v-model="pref.notifStart"
                                label="Notifier quand aucune tâche en cours depuis 5min"
                                color="primary"
                                hide-details
                            ></v-switch>
                        </v-row>
                        <v-row>
                            <v-switch
                                v-model="pref.notifAway"
                                label="Notifier quand inactif"
                                color="primary"
                                hide-details
                            ></v-switch>
                        </v-row>
                        <v-row v-if="pref.notifAway">
                            <v-select
                                v-model="pref.notifAwayDelay"
                                :items="delays"
                                label="Inactif depuis (min)"
                            ></v-select>
                        </v-row>
                    </v-card-text>
                </v-card>
            </v-tab-item>

            <v-tab-item>
                <v-card flat>
                    <v-card-text>
                        <v-row>
                            <v-text-field
                                v-model="pref.files.fullName"
                                label="Nom complet"
                            ></v-text-field>
                        </v-row>
                        <v-row>
                            <v-text-field
                                v-model="pref.files.salary"
                                label="Brut mensuel"
                            ></v-text-field>
                        </v-row>
                        <v-row>
                            <v-text-field
                                v-model="pref.files.hours"
                                label="Mensualisation heures"
                                hide-details
                            ></v-text-field>
                        </v-row>
                    </v-card-text>
                </v-card>
            </v-tab-item>
        </v-tabs>
        <v-btn elevation="2" @click="close" class="grey lighten-2"
            >Fermer</v-btn
        >
    </v-app>
</template>

<script lang="ts">
import { ipcRenderer } from "electron";
import { Component, Vue, Watch } from "vue-property-decorator";
import Config from "@/plugins/electronStore";

@Component({})
export default class Preferences extends Vue {
    private pref = {
        notifAway: true,
        notifAwayDelay: 5,
        notifStart: true,
        minimize: true,
        filter: "",
        files: {
            fullName: "John Doe",
            salary: "1234",
            hours: "155.55",
        },
    };

    private delays = [1, 5, 10, 15];

    @Watch("pref", { deep: true })
    onChangeAwait(item: any) {
        Config.set({ preferences: item });
    }

    public async mounted() {
        this.pref = Config.get("preferences");
    }

    public close() {
        this.$destroy();
    }

    public async beforeDestroy() {
        await ipcRenderer.invoke("closeWindow", "preferences");
    }
}
</script>

<style scoped lang="scss">
.v-application {
    font-family: Arial, sans-serif !important;
    font-size: 16px;
    .title {
        font-family: Arial, sans-serif !important;
        font-size: 16px;
    }
}
</style>
