<template>
    <div>
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
    </div>
</template>

<script lang="ts">
import { Component, Vue, Watch, Prop, Emit } from "vue-property-decorator";
import {
    RxClientDocument,
    RxItemsCollections,
    RxProjectDocument,
    RxTaskDocument,
    RxTimeDocument,
} from "@/RxDB";

import DatabaseService from "@/plugins/database";
import { RxDatabase } from "rxdb";
import { Subscription } from "rxjs";

export interface CustomItem {
    type: string;
    id: string;
    title: string;
    obj: RxClientDocument | RxProjectDocument | RxTaskDocument | RxTimeDocument;
}

@Component({})
export default class Selectors extends Vue {
    @Prop() task!: RxTaskDocument;

    private allItems: CustomItem[] = [];
    private selectedAll: CustomItem | null = null;
    private searchString = "";

    private clients: RxClientDocument[] = [];
    private selectedCl: RxClientDocument | null = null;

    private projects: RxProjectDocument[] = [];
    private selectedPj: RxProjectDocument | null = null;

    private tasks: RxTaskDocument[] = [];
    // @PropSync('selectedTk', { type: Object }) syncedName!: RxTaskDocument
    private selectedTk: RxTaskDocument | null = null;

    private allProjects: RxProjectDocument[] = [];
    private allTasks: RxTaskDocument[] = [];

    private setupDone = false;
    private db!: RxDatabase<RxItemsCollections>;
    private subCl: Subscription | null = null;
    private subPj: Subscription | null = null;
    private subTk: Subscription | null = null;
    
    @Watch("task", { immediate: true })
    async onChangeTask() {
        this.initPanel();
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
    async onChangeSelClient(item: RxClientDocument) {
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
    async onChangeSelProject(item: RxProjectDocument) {
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
    @Emit('change-task')
    async onChangeSelTask() {
        // this.$emit('change-task', this.selectedTk ? this.selectedTk.id : "");
        if (this.$refs.acplTk) {
            //@ts-ignore
            this.$refs.acplTk.blur();
        }

        return this.selectedTk;
    }

    public async mounted() {
        this.db = await DatabaseService.get();

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

        this.setupDone = true;
    }

    public async initPanel() {
        this.setupDone = false;

        this.selectedCl = null;
        this.selectedPj = null;
        this.selectedTk = null;

        if (this.task) {
            this.selectedTk = this.task;
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
    }
}
</script>

<style scoped lang="scss">
</style>
