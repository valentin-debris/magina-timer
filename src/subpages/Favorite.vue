<template>
    <v-app>
        <div class="title">Mes favoris</div>
        <v-main>
            <template>
                <v-data-table
                    :headers="headerTable"
                    :items="favorites"
                    mobile-breakpoint="1"
                    hide-default-footer
                    class="elevation-1"
                >
                    <template v-slot:top>
                        <v-dialog
                            v-model="dialog"
                            max-width="450px"
                            >
                            
                            <v-card>
                                <v-card-title>
                                    <span class="headline">Tâche associé</span>
                                </v-card-title>

                                <v-card-text>
                                    <v-container>
                                        <v-form ref="form">
                                            <v-row>
                                                <v-text-field
                                                v-model="editedItem.title"
                                                label="Titre"
                                                dense
                                                ></v-text-field>
                                            </v-row>
                                            <Selectors :task="task" @change-task="onChangeTask" />
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
                    </template>

                    <template v-slot:item.actions="{ item }">
                        <template 
                            v-if="item.tkTitle"
                        >
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
                        <template v-else>
                            <v-icon
                                small
                                class="mr-2"
                                @click="editItem(item)"
                            >
                                mdi-plus
                            </v-icon>
                        </template>
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
    RxItemsCollections,
    RxTaskDocument,
    RxFavoriteDocument
} from "@/RxDB";
import Selectors from "@/components/Panel/Selectors.vue";
import DatabaseService from "@/plugins/database";

import { RxDatabase } from "rxdb";

export interface CustomFavorite {
    shortcut: string;
    title: string;
    tkTitle: string;
    obj: RxFavoriteDocument | null;
}

@Component({
    components: { Selectors },
})
export default class Favorite extends Vue {
    private task: RxTaskDocument | null = null;
    private selectedTask: RxTaskDocument | null = null;

    private favorites: CustomFavorite[] = [];
    private headerTable = [
        { text: "Raccourci", value: "shortcut", sortable: false }, 
        { text: "Titre", value: "title", sortable: false }, 
        { text: "Tâche", value: "tkTitle", sortable: false }, 
        { text: 'Actions', value: 'actions', sortable: false }
    ];
    
    private db!: RxDatabase<RxItemsCollections>;

    private editedIndex = -1;
    private editedItem: CustomFavorite = {
        shortcut : "",
        title: "",
        tkTitle: "",
        obj: null
    };
    private defaultItem: CustomFavorite = {
        shortcut : "",
        title: "",
        tkTitle: "",
        obj: null
    };
    private dialog = false;
    private snackbar = false;
    private message = "";

    public async mounted() {
        this.db = await DatabaseService.get();

        await this.generateTableData();
    }

    public onChangeTask(tk: RxTaskDocument) {
        this.selectedTask = tk;
    }

    public async generateTableData() {
        this.favorites = [];
        for(let i=0; i<9; i++) {
            const obj = Object.assign({}, this.defaultItem);
            obj.shortcut = "Ctrl + "+(i+1);
            this.favorites[i] = obj;
        }

        await this.db.favorites
            .find().exec()
            .then(async (items) => {
                console.log("items : "+items.length);
                await Promise.all(
                    items.map(async (i) => {
                        console.log("fav found : "+i.position);
                        const tk =  await i.taskId_;
                        this.favorites[i.position-1].title = i.title;
                        this.favorites[i.position-1].tkTitle = await this.generateTkTitle(tk!);
                        this.favorites[i.position-1].obj = i;
                    })
                )
            })
    }

    public async generateTkTitle(item: RxTaskDocument) {
        if(!item) {
            return "-";
        }
        let subTitle = item.title;
        const pj = await item.projectId_;
        if (pj != null) {
            subTitle = pj.title + " | " + subTitle;
            const cl = await pj.clientId_;
            if (cl != null) {
                subTitle = cl.title + " | " + subTitle;
            }
        }
        return subTitle;
    }

    public async save() {
        await this.db.favorites.findOne({selector: {
            position : this.editedIndex+1
        }}).exec().then(async (i) => {
            if(!i)
                return;

            await i.atomicPatch({position: 0});
            return;
        });
    
        if(this.selectedTask) {
            console.log("ind "+this.editedIndex);
            const obj = {
                title: this.editedItem.title,
                position: this.editedIndex+1,
                taskId: this.selectedTask.id
            }
            this.db.favorites.insert(obj);
        }
        
        this.close();
        await this.generateTableData();
    }

    public async editItem (item: CustomFavorite) {
        this.task = null;
        if(item.obj)
            this.task = await item.obj.taskId_!;
        this.editedIndex = this.favorites.indexOf(item);
        this.editedItem = Object.assign({}, item);
        
        this.dialog = true;
    }

    public async deleteItem (item: CustomFavorite) {
        if(item.obj && confirm('Supprimer ce favoris ?')) {
            await item.obj.remove();
            await this.generateTableData();
        }
    }

    public close () {
        this.task = null;
        this.dialog = false
        this.$nextTick(() => {
            this.editedItem = Object.assign({}, this.defaultItem)
            this.editedIndex = -1
        })
    }

    public async beforeDestroy() {
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
