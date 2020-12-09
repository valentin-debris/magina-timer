<template>
    <div
        class="panel"
        v-bind:class="{ open: time }"
        v-click-outside="clickOutsidePanel"
    >
        <div class="infoTime" v-if="time">
            <v-row class="timeTitle">
                <v-text-field
                    label="Description"
                    v-model="description"
                    @focus="onFocusDesc"
                    @blur="onFocusDesc"
                ></v-text-field>

                <v-data-table
                    v-if="openLastTimes"
                    hide-default-footer
                    hide-default-header
                    :headers="headerDescs"
                    :items="lastTimes"
                    :search="description"
                    @click:row="onSelectLastT"
                ></v-data-table>
            </v-row>

            <v-row>
                <v-menu
                    v-model="openPicker"
                    :close-on-content-click="false"
                    :nudge-right="40"
                    transition="scale-transition"
                    offset-y
                    min-width="290px"
                >
                    <template v-slot:activator="{ on, attrs }">
                        <v-text-field
                            v-model="date"
                            label="Date début"
                            prepend-icon="mdi-calendar"
                            readonly
                            v-bind="attrs"
                            v-on="on"
                        ></v-text-field>
                    </template>
                    <v-date-picker
                        v-model="date"
                        @input="openPicker = false"
                    ></v-date-picker>
                </v-menu>
            </v-row>

            <v-row>
                <v-col cols="6">
                    <v-row>
                        <v-text-field
                            hide-details
                            v-model="start"
                            label="Début"
                            type="time"
                        ></v-text-field>
                    </v-row>
                </v-col>
                <v-col
                    v-if="!time.isCurrent"
                    cols="6"
                    class="end"
                    style="padding-left:15px"
                >
                    <v-row>
                        <v-text-field
                            hide-details
                            v-model="end"
                            label="Fin"
                            type="time"
                        ></v-text-field>
                    </v-row>
                </v-col>
            </v-row>

            <v-row>
                <v-autocomplete
                    ref="acplAll"
                    label="Recherche globale"
                    v-model="selectedAll"
                    auto-select-first
                    chips
                    clearable
                    :items="allItems"
                    item-text="title"
                    item-value="id"
                    return-object
                    :search-input.sync="searchString"
                    @change="onChangeAll"
                >
                </v-autocomplete>
            </v-row>

            <v-row>
                <v-autocomplete
                    ref="acplCl"
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

            <v-row>
                <v-autocomplete
                    ref="acplPj"
                    label="Projet"
                    v-model="selectedPj"
                    auto-select-first
                    chips
                    clearable
                    :items="projects"
                    item-value="id"
                    return-object
                >
                    <template v-slot:item="data">
                        {{ data.item.ref }} {{ data.item.title }}
                    </template>
                    <template v-slot:selection="data">
                        <v-chip
                            v-bind="data.attrs"
                            :input-value="data.selected"
                            @click="data.select"
                            @click:close="remove(data.item)"
                        >
                            {{ data.item.ref }} {{ data.item.title }}
                        </v-chip>
                    </template>
                </v-autocomplete>
            </v-row>

            <v-row>
                <v-autocomplete
                    ref="acplTk"
                    label="Tâche"
                    v-model="selectedTk"
                    auto-select-first
                    chips
                    clearable
                    hide-details
                    :items="tasks"
                    item-value="id"
                    return-object
                >
                    <template v-slot:item="data">
                        {{ data.item.refPropal }} {{ data.item.title }}
                    </template>
                    <template v-slot:selection="data">
                        <v-chip
                            v-bind="data.attrs"
                            :input-value="data.selected"
                            @click="data.select"
                            @click:close="remove(data.item)"
                        >
                            {{ data.item.refPropal }} {{ data.item.title }}
                        </v-chip>
                    </template>
                </v-autocomplete>
            </v-row>
            <br />

            <v-btn text icon x-large color="white" @click="updateTime">
                <v-icon>far fa-save</v-icon>
            </v-btn>

            <v-btn text icon x-small color="red lighten-2" @click="deleteTime">
                <v-icon>fa-trash-alt</v-icon>
            </v-btn>
        </div>
    </div>
</template>

<script lang="ts">
import { Component, Vue, Watch } from "vue-property-decorator";
import {
    RxClientDocument,
    RxItemsCollections,
    RxProjectDocument,
    RxTaskDocument,
    RxTimeDocument,
} from "@/RxDB";

import DatabaseService from "@/plugins/database";
import Dolibarr from "@/plugins/dolibarr";
import EventBus from "@/plugins/eventBus";
import { RxDatabase } from "rxdb";
import { Subscription } from "rxjs";
import TimeItem from "../TimeListDay/TimeItem.vue";

export interface CustomItem {
    type: string;
    id: string;
    title: string;
    obj: RxClientDocument | RxProjectDocument | RxTaskDocument | RxTimeDocument;
}

@Component({
    components: { TimeItem },
})
export default class Panel extends Vue {
    private time: RxTimeDocument | null = null;

    private headerDescs = [{ text: "titre", value: "title" }];
    private lastTimes: CustomItem[] = [];

    private allItems: CustomItem[] = [];
    private selectedAll: CustomItem | null = null;
    private searchString = "";

    private clients: RxClientDocument[] = [];
    private selectedCl: RxClientDocument | null = null;

    private projects: RxProjectDocument[] = [];
    private selectedPj: RxProjectDocument | null = null;

    private tasks: RxTaskDocument[] = [];
    private selectedTk: RxTaskDocument | null = null;

    private allProjects: RxProjectDocument[] = [];
    private allTasks: RxTaskDocument[] = [];

    private description = "";
    private start = "00:00";
    private end = "00:00";
    private date = new Date().toISOString().substr(0, 10);
    private openPicker = false;
    private openLastTimes = false;

    private setupDone = false;
    private db!: RxDatabase<RxItemsCollections>;
    private subCl: Subscription | null = null;
    private subPj: Subscription | null = null;
    private subTk: Subscription | null = null;
    private subTs: Subscription | null = null;

    public clickOutsidePanel() {
        if (this.setupDone == false || !this.time) return;
        this.time = null;
    }
    public onFocusDesc(e: FocusEvent) {
        if (e.type == "focus") this.openLastTimes = true;
        else {
            //use a delay to allow the "onSelectlastT" to works
            setTimeout(
                function() {
                    //@ts-ignore
                    this.openLastTimes = false;
                }.bind(this),
                500
            );
        }
    }

    public async onSelectLastT(i: CustomItem) {
        const t = i.obj as RxTimeDocument;
        if (t) {
            this.setupDone = false;

            this.description = t.title;

            if (!t.isPersonal) {
                this.selectedTk = await t.taskId_!;
                this.selectedPj = await this.selectedTk!.projectId_;
                this.selectedCl = await this.selectedPj!.clientId_;
            }

            await this.setupSelects();
            this.setupDone = true;
        }
    }

    public async onChangeAll(item: CustomItem) {
        if (this.setupDone == false || !item) return;
        this.setupDone = false;

        this.selectedCl = null;
        this.selectedPj = null;
        this.selectedTk = null;
        if (item.type == "client") {
            // @ts-ignore
            this.selectedCl = item.obj;
        } else if (item.type == "project") {
            // @ts-ignore
            this.selectedPj = item.obj;
            this.selectedCl = await this.selectedPj!.clientId_;
        } else if (item.type == "task") {
            // @ts-ignore
            this.selectedTk = item.obj;
            this.selectedPj = await this.selectedTk!.projectId_;
            this.selectedCl = await this.selectedPj!.clientId_;
        }
        await this.setupSelects();

        this.$nextTick(() => {
            this.searchString = "";
            this.selectedAll = null;
            if (this.$refs.acplAll)
                //@ts-ignore
                this.$refs.acplAll.blur();
        });

        this.setupDone = true;
    }

    @Watch("selectedCl")
    async onChangeClient(item: RxClientDocument) {
        if (this.setupDone == false) return;

        this.setupDone = false;
        this.selectedPj = null;
        this.selectedTk = null;
        await this.setupProjects(item);

        if (this.$refs.acplCl)
            //@ts-ignore
            this.$refs.acplCl.blur();
        this.setupDone = true;
    }

    @Watch("selectedPj")
    async onChangeProject(item: RxProjectDocument) {
        if (this.setupDone == false) return;

        this.setupDone = false;
        this.selectedTk = null;
        await this.setupTasks(item);
        if (this.$refs.acplPj)
            //@ts-ignore
            this.$refs.acplPj.blur();
        this.setupDone = true;
    }

    @Watch("selectedTk")
    async onChangeTask() {
        if (this.$refs.acplTk)
            //@ts-ignore
            this.$refs.acplTk.blur();
    }

    public async mounted() {
        this.db = await DatabaseService.get();

        EventBus.$on("TOGGLE_PAN", async (item: RxTimeDocument) => {
            if (item == this.time) {
                this.time = null;
                return;
            }
            this.time = item;
            await this.initPanel();
        });

        this.subCl = this.db.clients
            .find()
            .sort({
                title: "asc",
            })
            .$.subscribe((clients: RxClientDocument[]) => {
                if (clients) {
                    this.clients = clients;
                    clients.forEach((i) => {
                        this.allItems.push({
                            type: "client",
                            id: i.id,
                            title: "CL - " + i.title,
                            obj: i,
                        });
                    });
                }
            });
        this.subPj = this.db.projects
            .find()
            .sort({
                title: "asc",
            })
            .$.subscribe((projects: RxProjectDocument[]) => {
                if (projects) {
                    projects.forEach((i) => {
                        this.allItems.push({
                            type: "project",
                            id: i.id,
                            title: i.ref + " " + i.title,
                            obj: i,
                        });
                        const itemId = parseInt(i.clientId);
                        if (!this.allProjects[itemId]) {
                            //@ts-ignore
                            this.allProjects[itemId] = [];
                        }

                        //@ts-ignore
                        this.allProjects[itemId].push(i);
                    });
                }
            });
        this.subTk = this.db.tasks
            .find()
            .sort({
                refPropal: "asc",
            })
            .$.subscribe((tasks: RxTaskDocument[]) => {
                if (tasks) {
                    tasks.forEach((i) => {
                        this.allItems.push({
                            type: "task",
                            id: i.id,
                            title: i.refPropal + " " + i.title,
                            obj: i,
                        });
                        const itemId = parseInt(i.projectId);
                        if (!this.allTasks[itemId]) {
                            //@ts-ignore
                            this.allTasks[itemId] = [];
                        }
                        //@ts-ignore
                        this.allTasks[itemId].push(i);
                    });
                }
            });

        this.subTs = this.db.times
            .findOne({
                selector: {
                    isCurrent: 1,
                },
            })
            .$.subscribe(async (time) => {
                if (!time) {
                    //Update the setup with the last one
                    await this.setupLastTimes();
                }
            });

        await this.setupLastTimes();
        EventBus.$on("APP_SYNCHRONIZE_DONE", async () => {
            await this.setupLastTimes();
        });
    }

    public async setupLastTimes() {
        //Get the last times for the previous 14 days
        await this.db.times
            .find({
                selector: {
                    $and: [
                        {
                            start: {
                                $gte:
                                    Math.trunc(new Date().getTime() / 1000) -
                                    14 * 24 * 3600,
                            },
                        },
                        { isPersonal: 0 },
                    ],
                },
            })
            .sort({
                start: "desc",
            })
            .exec()
            .then((times) => {
                this.lastTimes = [];
                const filters: string[] = [];
                times.forEach(async (i) => {
                    if (filters.includes(i.title + i.taskId)) {
                        return;
                    }
                    filters.push(i.title + i.taskId);

                    let title = i.title;
                    const tk = await i.taskId_;
                    const cl = await (await tk?.projectId_)?.clientId_;
                    if (cl) {
                        if (tk!.title) title += " | " + tk!.title;
                        else title += " | " + tk!.refPropal;

                        title += " | " + cl.title;
                    } else {
                        title += " | Perso";
                    }
                    this.lastTimes.push({
                        id: i.id,
                        type: "time",
                        title: title,
                        obj: i,
                    });
                });
            });
    }

    public beforeDestroy() {
        if (this.subCl) {
            this.subCl.unsubscribe();
        }
        if (this.subPj) {
            this.subPj.unsubscribe();
        }
        if (this.subTk) {
            this.subTk.unsubscribe();
        }
        if (this.subTs) {
            this.subTs.unsubscribe();
        }
    }

    public async initPanel() {
        if (!this.time) return;
        this.setupDone = false;

        this.description = this.time.title;

        this.date = this.time.getFullDate();
        this.start = this.time.getTimeStart();
        this.end = this.time.getTimeEnd();

        this.selectedCl = null;
        this.selectedPj = null;
        this.selectedTk = null;

        if (this.time.taskId && this.time.taskId != "0") {
            this.selectedTk = await this.time.taskId_!;
            this.selectedPj = await this.selectedTk.projectId_;
            this.selectedCl = await this.selectedPj.clientId_;
        }

        await this.setupSelects();
        this.setupDone = true;
    }

    public async setupSelects() {
        this.setupDone = false;

        await this.setupProjects(this.selectedCl);

        this.setupDone = true;
    }

    public async setupProjects(parent: RxClientDocument | null) {
        if (parent) {
            //@ts-ignore
            this.projects = this.allProjects[parseInt(parent.id)];

            if (this.projects && this.projects.length == 1) {
                this.selectedPj = this.projects[0];
            }
            await this.setupTasks(this.selectedPj);
        } else {
            this.projects = [];
            this.selectedPj = null;
            this.tasks = [];
            this.selectedTk = null;
        }
    }

    public async setupTasks(parent: RxProjectDocument | null) {
        if (parent) {
            //@ts-ignore
            this.tasks = this.allTasks[parseInt(parent.id)];

            if (this.tasks && this.tasks.length == 1) {
                this.selectedTk = this.tasks[0];
            }
        } else {
            this.tasks = [];
            this.selectedTk = null;
        }
    }

    public async updateTime() {
        if (!this.time) return;

        const secStart = this.hmToSecondsOnly(this.start);
        const secEnd = this.hmToSecondsOnly(this.end);
        const duration = secEnd - secStart;

        const dateDay = new Date(this.date);
        dateDay.setUTCHours(0, 0, secStart, 0);
        const tsDay = parseInt("" + dateDay.getTime() / 1000, 10);

        const taskId = this.selectedTk?.id;

        await this.time.atomicUpdate((t) => {
            t.title = this.description;
            t.start = tsDay;

            if (t.isCurrent == 0) {
                t.duration = duration + "";
            }

            t.needRemove = 0;
            if (taskId) {
                if (
                    t.isCurrent == 0 &&
                    t.taskId != taskId &&
                    t.taskId != "" &&
                    t.taskId != "0"
                ) {
                    t.futurTaskId = taskId;
                } else {
                    t.taskId = taskId;
                }

                t.isPersonal = 0;
                if (t.dolibarrId != "") {
                    t.needInsert = 0;
                    t.needUpdate = 1;
                } else {
                    t.needInsert = 1;
                    t.needUpdate = 0;
                }
            } else {
                t.isPersonal = 1;
                if (t.dolibarrId) {
                    //remove from dolibarr if remove previous task and no more defined
                    t.needRemove = 1;
                    t.needInsert = 0;
                    t.needUpdate = 0;
                }
            }
            return t;
        });

        await Dolibarr.updateDolibarr(this.time);
        this.time = null;
    }

    public async deleteTime() {
        if (!this.time) return;

        await this.time?.atomicUpdate((t) => {
            t.needInsert = 0;
            t.needUpdate = 0;
            t.needRemove = 1;
            return t;
        });
        await Dolibarr.updateDolibarr(this.time);

        this.time = null;
    }

    public hmToSecondsOnly(str: string) {
        const p = str.split(":");
        let s = 0,
            m = 60;

        while (p.length > 0) {
            s += m * parseInt(p.pop()!, 10);
            m *= 60;
        }

        return s;
    }
}
</script>

<style scoped lang="scss">
.panel {
    position: fixed;
    top: 0;
    right: 0px;
    bottom: 0;
    z-index: 5;
    background-color: #171717;
    color: white;
    transform: translateX(100%);
    transition: transform 0.5s;
    padding: 10px;
    overflow-y: auto;
    min-width: 200px;
    max-width: 300px;
    margin-left: 50px;
    padding: 0 20px;
    padding-top: 10px;

    &.open {
        transform: translateX(0%);
    }
    ::v-deep {
        .v-input__prepend-outer {
            padding: 4px 9px 4px 0px;
            margin: 0;
            background: var(--v-primary-base);
            i {
                color: white !important;
            }
        }

        input {
            line-height: 2em;
            height: 2em;
            background-color: var(--v-primary-base);
            color: white !important;
            caret-color: white;
        }

        label.v-label {
            color: white;

            &.v-label--active {
                //When above the select items
                color: white !important;
                top: 0px;
                font-size: 20px;
            }
        }
    }
    .timeTitle {
        position: relative;
        .v-data-table {
            position: absolute;
            z-index: 10;
            left: 0;
            right: 0;
            bottom: 20px;
            transform: translateY(100%);

            ::v-deep {
                .v-data-table__mobile-row {
                    &:hover {
                        background: #6161613b;
                    }
                    .v-data-table__mobile-row__cell {
                        text-align: left !important;
                    }
                }
            }
        }
    }
    .v-autocomplete {
        ::v-deep .v-select__slot {
            background: var(--v-primary-base);

            .chip--select {
                background: none;
                color: white;
            }

            .v-chip {
                height: auto;
                .v-chip__content {
                    padding: 5px 0;
                    white-space: initial;
                }
            }

            .fa-times-circle:before {
                color: rgba(0, 0, 0, 0.54);
            }
        }
    }

    input,
    select {
        width: 100%;
        padding: 0;
        border: 0;
        line-height: 2em;
        height: 2em;
        background-color: var(--v-primary-base);
        color: white;
    }

    .timeTitle,
    .timePersonal {
        .choices[data-type*="select-one"] {
            > .choices__inner,
            &::after,
            .choices__input {
                display: none;
            }
        }
    }

    button {
        background: transparent;
        color: white;
        border: none;
        font-size: 1.5rem;
        margin-right: 10px;
        cursor: pointer;
    }
}
</style>
