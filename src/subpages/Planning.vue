<template>
    <v-app>
        <div class="title">Plannifier mes limites</div>
        <v-main>
            
            <template>
                <v-data-table
                    :headers="headerTable"
                    :items="schedules"
                    mobile-breakpoint="1"
                    class="elevation-1"
                >
                    <template v-slot:top>
                    <v-toolbar
                        flat
                    >
                        <v-toolbar-title>Mon planning</v-toolbar-title>
                        <v-divider
                        class="mx-4"
                        inset
                        vertical
                        ></v-divider>
                        <v-spacer></v-spacer>
                        <v-dialog
                        v-model="dialog"
                        max-width="800px"
                        >
                        <template v-slot:activator="{ on, attrs }">
                            <v-btn
                            color="primary"
                            dark
                            class="mb-2"
                            v-bind="attrs"
                            v-on="on"
                            >
                                Nouvelle limite
                            </v-btn>
                        </template>
                        <v-card>
                            <v-card-title>
                                <span class="headline">{{ formTitle }}</span>
                            </v-card-title>

                            <v-card-text>
                                <v-container>
                                    <v-form ref="form" v-model="valid">
                                        <v-row>
                                            <v-col
                                                cols="12"
                                                sm="5"
                                            >
                                                <v-text-field
                                                v-model="editedItem.title"
                                                :rules="titleRules"
                                                label="Titre"
                                                required
                                                dense
                                                ></v-text-field>
                                            </v-col>
                                            <v-col
                                                cols="12"
                                                sm="2"
                                            >
                                                <v-text-field
                                                v-model="editedItem.limit"
                                                :rules="limitRules"
                                                label="Temps/mois"
                                                type="number"
                                                required
                                                dense
                                                ></v-text-field>
                                            </v-col>
                                            <v-col
                                                cols="12"
                                                sm="5"
                                            >
                                                <v-autocomplete
                                                    ref="acplAll"
                                                    label="Item lié"
                                                    v-model="selectedAll"
                                                    :rules="relatedRules"
                                                    auto-select-first
                                                    chips
                                                    clearable
                                                    :items="allItems"
                                                    item-text="title"
                                                    item-value="id"
                                                    return-object
                                                    required
                                                    dense
                                                >
                                                </v-autocomplete>
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

                    
                    <template v-slot:item.limit="{ item }">
                        {{ formatDuration(item.limit) }}
                    </template>

                    <template v-slot:item.now="{ item }">
                        <v-chip
                            :color='getColor(item.limit, item.now)'
                            dark
                        >{{ formatDuration(item.now) }}
                        </v-chip>
                    </template>

                    <template v-slot:item.previous="{ item }">
                        <v-chip
                            :color='getColor(item.limit, item.previous)'
                            dark
                        >{{ formatDuration(item.previous) }}
                        </v-chip>
                    </template>

                    <template v-slot:item.actions="{ item }">
                        <v-icon
                            small
                            class="mr-2"
                            @click="editItem(item)"
                        >
                            mdi-pencil
                        </v-icon>
                        <v-icon
                            small
                            @click="deleteItem(item)"
                        >
                            mdi-delete
                        </v-icon>
                    </template>
                </v-data-table>
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

import {
    RxClientDocument,
    RxItemsCollections,
    RxProjectDocument,
    RxTaskDocument,
    RxTimeDocument,
    RxScheduleDocument
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

export interface CustomSchedule {
    id: string;
    title: string;
    limit: number;
    now: number;
    previous: number;
    related: string;
    obj: RxScheduleDocument | null;
}

@Component({})
export default class Planning extends Vue {
    // private title = "";
    // private limitTime = 0;
    private allItems: CustomItem[] = [];
    private selectedAll: CustomItem | null = null;

    private schedules: CustomSchedule[] = [];
    private headerTable = [
        { text: "Titre", value: "title" }, 
        { text: "Limite", value: "limit" }, 
        { text: "Mois actuel", value: "now" }, 
        { text: "Mois précédent", value: "previous" }, 
        { text: "Item", value: "related" },
        { text: 'Actions', value: 'actions', sortable: false }];
    
    private db!: RxDatabase<RxItemsCollections>;
    private subCl: Subscription | null = null;
    private subPj: Subscription | null = null;
    private subTk: Subscription | null = null;

    private editedIndex = -1;
    private editedItem: CustomSchedule = {
        id: '',
        title: '',
        limit: 0,
        now: 0,
        previous: 0,
        related: '',
        obj: null
    };
    private defaultItem: CustomSchedule = {
        id: '',
        title: '',
        limit: 0,
        now: 0,
        previous: 0,
        related: '',
        obj: null
    };
    private dialog = false;
    private snackbar = false;
    private message = "";

    private valid = false;
    private titleRules = [
        (v: string) => !!v || "Titre requis"
    ];
    private limitRules = [
        (v: number) => !!v || "Temps requis",
        (v: number) => v > 0 || "Temps invalide",
    ];
    private relatedRules = [
        (v: CustomItem) => !!v || "Item requis"
    ];
    
    get formTitle () {
        return this.editedIndex === -1 ? 'Nouvelle limite' : 'Modifier limite'
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
                    clients.forEach((i) => {
                        this.allItems.push({
                            type: i.className(),
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
                            type: i.className(),
                            id: i.id,
                            title: i.ref + " " + i.title,
                            obj: i,
                        });
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
                            type: i.className(),
                            id: i.id,
                            title: i.refPropal + " " + i.title,
                            obj: i,
                        });
                    });
                }
            });

        await this.generateTableData();
    }

    public async generateTableData() {
        
        const date = new Date(), y = date.getFullYear(), m = date.getMonth();
        const firstDayCurrent = new Date(y, m, 1);
        const lastDayCurrent = new Date(y, m + 1, 1);

        const firstDayPrevious = new Date(y, m-1, 1);
        
        await this.db.schedules
            .find().exec()
            .then(async (items) => {
                this.schedules = await Promise.all(
                    items.map(async (i) => {
                        let titleRelated = "-";
                        if(i.clientId) {
                            titleRelated = "CL- "+(await i.clientId_)!.title;
                        } else if(i.projectId) {
                            titleRelated = "PJ- "+(await i.projectId_)!.title;
                        } else if(i.taskId) {
                            titleRelated = "TK- "+(await i.taskId_)!.title;
                        }

                        const totalCurrent = await this.foundTotalTimes(firstDayCurrent, lastDayCurrent, i);
                        const totalPrevious = await this.foundTotalTimes(firstDayPrevious, firstDayCurrent, i);

                        return {
                            id: i.id,
                            title: i.title,
                            limit: i.duration*3600,
                            now: totalCurrent,
                            previous: totalPrevious,
                            related: titleRelated,
                            obj: i
                        };
                    })
                )
            })
    }

    /**
     * the dates are for 0AM, so check betwen first day of month and first day of next month
     */
    public async foundTotalTimes(dayStart: Date, dayEnd: Date, item: RxScheduleDocument): Promise<number> {
        const taskIds = [];
        if(item.taskId) {
            taskIds.push(item.taskId);
        }
        else if(item.projectId) {
            const tasks = await this.db.tasks.find({
                selector: {
                    projectId: item.projectId,
                },
            })
            .exec();
            tasks.map(i => {
                taskIds.push(i.id);
            });
        } else if(item.clientId) {
            
            const projects = await this.db.projects.find({
                selector: {
                    clientId: item.clientId,
                },
            })
            .exec();

            const projectIds: string[] = [];
            projects.map((i) => {
                projectIds.push(i.id + "");
            });

            const tasks = await this.db.tasks.find({
                    selector: {
                        projectId: { $in: projectIds },
                    },
                })
                .exec();

            tasks.map(i => {
                taskIds.push(i.id);
            });
        }
        
        const items = await this.db.times
                .find({
                    selector: {
                        $and: [
                            {
                                start: {
                                    $gte: Math.trunc(dayStart.getTime() / 1000),
                                },
                            },
                            {
                                start: {
                                    $lt: Math.trunc(dayEnd.getTime() / 1000),
                                },
                            },
                            {
                                taskId: {
                                    $in: taskIds,
                                },
                            },
                        ],
                    },
                })
                .exec();
        
        let totalSeconds = 0;
        items.map(i => totalSeconds+= parseInt(i.duration))
        return totalSeconds;
    } 

    public formatDuration(totalSec: number) {
        // return (totalSec/3600).toFixed(1);

        const hours = Math.floor(totalSec / 3600);
        const minutes = Math.floor((totalSec - hours * 3600) / 60);

        let suf = "h";
        if (minutes < 10) suf= "h0";
        
        return hours + suf + minutes;
    }

    public getColor(limit: number, real: number) {
        if(real > limit ) {
            return 'red';
        }
        return 'green';
    }

    public async save() {
        //@ts-ignore
        this.$refs.form.validate();
        if(!this.valid)
            return;

        if(!this.selectedAll) {
            this.message = "Veuillez rechercher un item";
            this.snackbar = true;
            return;
        }
        if(this.editedItem.limit <= 0) {
            this.message = "Veuillez définir une durée";
            this.snackbar = true;
            return;
        }
        if(!this.editedItem.title) {
            this.message = "Veuillez définir un titre";
            this.snackbar = true;
            return;
        }

        let clId = "", pjId = "", tkId = "";
        const selObj = this.selectedAll.obj;
        switch(this.selectedAll.type) {
            case "client":
                clId = selObj.id;
                break;
            case "project":
                pjId = selObj.id;
                break;
            case "task":
                tkId = selObj.id;
                break;
        }
        
        //New item
        if(this.editedIndex === -1) {
            const obj = {
                id: "",
                title: this.editedItem.title,
                duration: parseFloat(this.editedItem.limit+""),
                clientId: clId,
                projectId: pjId,
                taskId: tkId
            };
            await this.db.schedules.insert(obj);
        } else { //Update
            const sched = await this.db.schedules.
            findOne({
                selector: {
                    id: this.editedItem.id
                }
            }).exec();

            if(sched) {
                await sched.atomicUpdate((data) => {
                    data.title = this.editedItem.title;
                    data.duration = parseFloat(this.editedItem.limit+"");
                    data.clientId = clId;
                    data.projectId = pjId;
                    data.taskId = tkId;
                    return data;
                });
            }
        }
        
        this.close();
        await this.generateTableData();
    }

    public async editItem (item: CustomSchedule) {
        this.editedIndex = this.schedules.indexOf(item);
        this.editedItem = Object.assign({}, item);
        this.editedItem.limit = parseFloat((this.editedItem.limit/3600).toFixed(1));
        
        if(this.editedItem.obj) {
            //@ts-ignore
            const typeObj = (await this.editedItem.obj.getRelated()).className(); 
            //@ts-ignore
            const idObj = (await this.editedItem.obj.getRelated()).id;
            this.allItems.forEach(i => {
                if(i.type == typeObj && i.id == idObj)
                    this.selectedAll = i;
            });
        }
        this.dialog = true;
    }

    public async deleteItem (item: CustomSchedule) {
        if(confirm('Supprimer cette limite ?')) {
            const sched = await this.db.schedules.findOne({
                selector: {
                    id: item.id
                }
            }).exec();

            await sched?.remove();
            await this.generateTableData();
        }
    }

    public close () {
        this.dialog = false
        this.$nextTick(() => {
            this.editedItem = Object.assign({}, this.defaultItem)
            this.editedIndex = -1
        })
    }

    public async beforeDestroy() {
        if (this.subCl) {
            this.subCl.unsubscribe();
        }
        if (this.subPj) {
            this.subPj.unsubscribe();
        }
        if (this.subTk) {
            this.subTk.unsubscribe();
        }
        await ipcRenderer.invoke("closeWindow", "planning");
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
