<template>
    <v-app>
        <div class="title">Congés</div>
        <v-main>
            <template>
                <v-simple-table>
                    <template v-slot:default>
                        <thead>
                            <tr>
                                <th class="text-left">Nom</th>
                                <th class="text-left">Début</th>
                                <th class="text-left">Fin</th>
                                <th class="text-left">Détail</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr
                                v-for="item in holidays"
                                :key="item.id"
                                :class="item.isNow() ? 'current' : ''"
                            >
                                <td>{{ item.fullname }}</td>
                                <td>{{ item.getDateStart() }}</td>
                                <td>{{ item.getDateEnd() }}</td>
                                <td>
                                    <div
                                        style="display: flex; justify-content: space-between;"
                                    >
                                        <div>
                                            {{ item.description }}
                                        </div>
                                        <div v-if="item.owner">
                                            <template>
                                                <v-icon
                                                    small
                                                    @click="deleteItem(item)"
                                                >
                                                    mdi-delete
                                                </v-icon>
                                            </template>
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </template>
                </v-simple-table>

                <template>
                    <v-toolbar flat>
                        <v-divider class="mx-4" inset vertical></v-divider>
                        <v-spacer></v-spacer>
                        <v-dialog v-model="dialog" max-width="800px">
                            <template v-slot:activator="{ on, attrs }">
                                <v-btn
                                    color="primary"
                                    dark
                                    class="mb-2"
                                    v-bind="attrs"
                                    v-on="on"
                                >
                                    Nouveau congé
                                </v-btn>
                            </template>
                            <v-card>
                                <v-card-title>
                                    <span class="headline">{{
                                        formTitle
                                    }}</span>
                                </v-card-title>

                                <v-card-text>
                                    <v-container>
                                        <v-form ref="form" v-model="valid">
                                            <v-row>
                                                <v-col cols="12" sm="6">
                                                    <v-menu
                                                        ref="menu"
                                                        v-model="menu"
                                                        :close-on-content-click="
                                                            false
                                                        "
                                                        :return-value.sync="
                                                            pickerDates
                                                        "
                                                        transition="scale-transition"
                                                        offset-y
                                                        min-width="auto"
                                                    >
                                                        <template
                                                            v-slot:activator="{
                                                                on,
                                                                attrs
                                                            }"
                                                        >
                                                            <v-text-field
                                                                v-model="
                                                                    pickerDates
                                                                "
                                                                label="Dates de congés"
                                                                prepend-icon="mdi-calendar"
                                                                readonly
                                                                required
                                                                v-bind="attrs"
                                                                v-on="on"
                                                            ></v-text-field>
                                                        </template>
                                                        <v-date-picker
                                                            v-model="
                                                                pickerDates
                                                            "
                                                            no-title
                                                            scrollable
                                                            range
                                                        >
                                                            <v-spacer></v-spacer>
                                                            <v-btn
                                                                text
                                                                color="primary"
                                                                @click="
                                                                    menu = false
                                                                "
                                                            >
                                                                Annuler
                                                            </v-btn>
                                                            <v-btn
                                                                text
                                                                color="primary"
                                                                @click="
                                                                    $refs.menu.save(
                                                                        pickerDates
                                                                    )
                                                                "
                                                            >
                                                                OK
                                                            </v-btn>
                                                        </v-date-picker>
                                                    </v-menu>
                                                </v-col>
                                                <v-col cols="12" sm="6">
                                                    <v-text-field
                                                        v-model="description"
                                                    ></v-text-field>
                                                </v-col>
                                            </v-row>
                                        </v-form>
                                    </v-container>
                                </v-card-text>

                                <v-card-actions>
                                    <v-spacer></v-spacer>
                                    <v-btn
                                        color="blue darken-1"
                                        text
                                        @click="close"
                                    >
                                        Annuler
                                    </v-btn>
                                    <v-btn
                                        color="blue darken-1"
                                        text
                                        @click="save"
                                    >
                                        Sauvegarder
                                    </v-btn>
                                </v-card-actions>
                            </v-card>
                        </v-dialog>
                    </v-toolbar>
                </template>
            </template>
        </v-main>

        <v-snackbar v-model="snackbar" timeout="2000">
            {{ message }}
        </v-snackbar>
    </v-app>
</template>

<script lang="ts">
import { ipcRenderer } from "electron";
import { Component, Vue } from "vue-property-decorator";

import { RxItemsCollections, RxHolidayDocument } from "@/RxDB";
import DatabaseService from "@/plugins/database";

import { RxDatabase } from "rxdb";
import dolibarr from "@/plugins/dolibarr";

@Component({
    components: {}
})
export default class Holidays extends Vue {
    private holidays: RxHolidayDocument[] = [];

    private db!: RxDatabase<RxItemsCollections>;

    private dialog = false;
    private snackbar = false;
    private message = "";

    private pickerDates = [];
    private description = "";
    private menu = false;
    private valid = false;

    private editedIndex = -1;

    get formTitle() {
        return (this.editedIndex === -1 ? "Nouveau" : "Modifier") + " congé";
    }

    public created() {
        window.addEventListener(
            "beforeunload",
            function() {
                //@ts-ignore
                this.$destroy();
            }.bind(this)
        );
    }

    public async mounted() {
        this.db = await DatabaseService.get();

        await this.generateTableData();
    }

    public async generateTableData() {
        this.holidays = await this.db.holidays
            .find()
            .sort({
                dateDebut: "asc"
            })
            .exec();
    }

    public async save() {
        //@ts-ignore
        this.$refs.form.validate();

        if (!this.valid || this.pickerDates.length == 0) return;

        let start = this.pickerDates[0];
        let end = this.pickerDates[0];
        if (this.pickerDates.length == 2) {
            this.pickerDates.sort();
            start = this.pickerDates[0];
            end = this.pickerDates[1];
        }

        const dateStart = new Date(start);
        dateStart.setUTCHours(0, 0, 0, 0);
        const tsStart = parseInt("" + dateStart.getTime() / 1000, 10);

        const dateEnd = new Date(end);
        dateEnd.setUTCHours(23, 59, 59, 0);
        const tsEnd = parseInt("" + dateEnd.getTime() / 1000, 10);

        const obj = {
            id: "",
            description: this.description,
            fullname: "me",
            dateDebut: tsStart,
            dateFin: tsEnd,
            dolibarrId: "",
            statut: 2,
            existRemote: 0,
            owner: 1,
            needInsert: 1,
            needUpdate: 0,
            needRemove: 0
        };
        const holiday = await this.db.holidays.insert(obj);

        const result = await dolibarr.manageHoliday(holiday);

        if (result == true) {
            this.message = "Congé enregistré";
            await this.generateTableData();
            this.close();
        } else {
            this.message = "Le congé n'a pas été enregistré";
        }
        this.snackbar = true;
    }

    public async deleteItem(item: RxHolidayDocument) {
        if (confirm("Supprimer ce congé ?")) {
            await item.atomicUpdate(t => {
                t.needInsert = 0;
                t.needUpdate = 0;
                t.needRemove = 1;
                return t;
            });
            await dolibarr.manageHoliday(item);
            await this.generateTableData();
        }
    }

    public close() {
        this.dialog = false;
        this.description = "";
        this.pickerDates = [];
    }

    public async beforeDestroy() {
        await ipcRenderer.invoke("closeWindow", "holidays");
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

    .v-data-table > .v-data-table__wrapper > table > tbody > tr {
        &.current {
            background-color: lightgreen;
        }
        > td {
            height: 35px;
        }
    }
}
</style>
