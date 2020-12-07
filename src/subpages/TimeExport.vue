<template>
    <v-app>
        <div class="title">Exporter mes temps</div>
        <v-main>
            <v-container>
                <v-radio-group v-model="typeSel">
                    <template v-slot:label>
                        <div>Type d'export</div>
                    </template>
                    <v-radio
                        label="Ma feuille de temps"
                        value="hours"
                    ></v-radio>
                    <v-radio
                        label="Mon détail d'activité"
                        value="details"
                    ></v-radio>
                </v-radio-group>

                <v-row v-if="typeSel == 'hours'">
                    <v-menu
                        v-model="openPicker.month"
                        :close-on-content-click="false"
                        :nudge-right="40"
                        transition="scale-transition"
                        offset-y
                        min-width="290px"
                    >
                        <template v-slot:activator="{ on, attrs }">
                            <v-text-field
                                v-model="month"
                                label="Date début"
                                prepend-icon="mdi-calendar"
                                readonly
                                v-bind="attrs"
                                v-on="on"
                            ></v-text-field>
                        </template>
                        <v-date-picker
                            v-model="month"
                            type="month"
                            @input="openPicker.month = false"
                        ></v-date-picker>
                    </v-menu>
                </v-row>

                <template v-if="typeSel == 'details'">
                    <v-row>
                        <v-col cols="6">
                            <v-menu
                                v-model="openPicker.start"
                                :close-on-content-click="false"
                                :nudge-right="40"
                                transition="scale-transition"
                                offset-y
                                min-width="290px"
                            >
                                <template v-slot:activator="{ on, attrs }">
                                    <v-text-field
                                        v-model="start"
                                        label="Date de début"
                                        prepend-icon="mdi-calendar"
                                        readonly
                                        v-bind="attrs"
                                        v-on="on"
                                    ></v-text-field>
                                </template>
                                <v-date-picker
                                    v-model="start"
                                    @input="openPicker.start = false"
                                ></v-date-picker>
                            </v-menu>
                        </v-col>
                        <v-col cols="6">
                            <v-menu
                                v-model="openPicker.end"
                                :close-on-content-click="false"
                                :nudge-right="40"
                                transition="scale-transition"
                                offset-y
                                min-width="290px"
                            >
                                <template v-slot:activator="{ on, attrs }">
                                    <v-text-field
                                        v-model="end"
                                        label="Date de fin"
                                        prepend-icon="mdi-calendar"
                                        readonly
                                        v-bind="attrs"
                                        v-on="on"
                                    ></v-text-field>
                                </template>
                                <v-date-picker
                                    v-model="end"
                                    @input="openPicker.end = false"
                                ></v-date-picker>
                            </v-menu>
                        </v-col>
                    </v-row>

                    <v-row>
                        <v-autocomplete
                            label="Client"
                            v-model="selectedCl"
                            auto-select-first
                            chips
                            clearable
                            :items="clients"
                            item-text="title"
                            item-value="id"
                            return-object
                        ></v-autocomplete>
                    </v-row>
                </template>

                <v-row>
                    <v-switch
                        v-model="round"
                        label="Temps arrondis à 0.5"
                        color="primary"
                        hide-details
                    ></v-switch>
                </v-row>

                <v-row>
                    <v-switch
                        v-model="showDesc"
                        label="Afficher les descriptions"
                        color="primary"
                        hide-details
                    ></v-switch>
                </v-row>
            </v-container>
        </v-main>
        <v-btn color="primary" elevation="2" v-on:click="generate()" label
            >Générer</v-btn
        >
        <v-btn elevation="2" v-on:click="close()" class="grey lighten-2"
            >Fermer</v-btn
        >

        <v-snackbar v-model="snackbar" timeout="2000">
            {{ resultExport }}
        </v-snackbar>
    </v-app>
</template>

<script lang="ts">
import { ipcRenderer } from "electron";
import { Component, Vue } from "vue-property-decorator";

import { RxClientDocument } from "@/RxDB";
import DatabaseService from "@/plugins/database";
import DateConv from "@/plugins/dateConv";
import Export from "@/plugins/export";

@Component({})
export default class TimeExport extends Vue {
    private typeSel = "hours";
    private month = "2020-10";
    private start = new Date().toISOString().substr(0, 10);
    private end = new Date().toISOString().substr(0, 10);
    private openPicker = {
        month: false,
        start: false,
        end: false,
    };
    private snackbar = false;
    private resultExport = "";

    private clients: RxClientDocument[] = [];
    private selectedCl: RxClientDocument | null = null;

    private round = true;
    private showDesc = true;

    public async mounted() {
        const dateN = new Date();
        const firstDay = new Date(dateN.getFullYear(), dateN.getMonth(), 1);
        const lastDay = new Date(dateN.getFullYear(), dateN.getMonth() + 1, 0);

        this.month = DateConv.formatYearMonth();
        this.start = DateConv.formatFullDate(firstDay);
        this.end = DateConv.formatFullDate(lastDay);

        const db = await DatabaseService.get();
        this.clients = await db.clients
            .find()
            .sort({
                title: "asc",
            })
            .exec();
    }

    public async generate() {
        let generateWorks = false;
        if (this.typeSel == "hours") {
            generateWorks = await Export.exportHours(this.month, this.round);
        } else {
            generateWorks = await Export.exportDetails(
                this.start,
                this.end,
                this.round,
                this.selectedCl,
                this.showDesc
            );
        }
        this.resultExport = "L'export n'a pas été généré.";
        if (generateWorks) {
            this.resultExport = "L'export a été généré.";
        }
        this.snackbar = true;
    }

    public async close() {
        this.$destroy();
    }

    public async beforeDestroy() {
        await ipcRenderer.invoke("closeWindow", "timeExport");
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
        color: white;
        background-color: var(--v-primary-base);
        text-align: center;
        padding: 5px;
    }
}
</style>
