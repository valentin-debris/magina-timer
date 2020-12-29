<template>
    <div
        class="panel"
        v-bind:class="{ open: time }"
        v-click-outside="clickOutsidePanel"
    >
        <div class="infoTime" v-if="time">
            <v-row class="timeTitle" v-click-outside="onFocusDesc">
                <v-text-field
                    label="Description"
                    v-model="description"
                    @focus="onFocusDesc"
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

            <Selectors :task="task" @change-task="onChangeTask" />
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
import { Component, Vue } from "vue-property-decorator";
import {
    RxClientDocument,
    RxItemsCollections,
    RxProjectDocument,
    RxTaskDocument,
    RxTimeDocument,
} from "@/RxDB";

import Selectors from "@/components/Panel/Selectors.vue";
import DatabaseService from "@/plugins/database";
import Dolibarr from "@/plugins/dolibarr";
import EventBus from "@/plugins/eventBus";
import { RxDatabase } from "rxdb";
import { Subscription } from "rxjs";

export interface CustomItem {
    type: string;
    id: string;
    title: string;
    obj: RxClientDocument | RxProjectDocument | RxTaskDocument | RxTimeDocument;
}

@Component({
    components: { Selectors },
})
export default class Panel extends Vue {
    private time: RxTimeDocument | null = null;

    private headerDescs = [{ text: "titre", value: "title" }];
    private lastTimes: CustomItem[] = [];

    private task: RxTaskDocument | null = null;
    private taskId = "";

    private description = "";
    private start = "00:00";
    private end = "00:00";
    private date = new Date().toISOString().substr(0, 10);
    private openPicker = false;
    private openLastTimes = false;

    private setupDone = false;
    private db!: RxDatabase<RxItemsCollections>;
    private subTs: Subscription | null = null;

    public onChangeTask(tk: RxTaskDocument) {
        this.taskId = "";
        if(tk){
            this.taskId = tk.id;
        }
    }

    public clickOutsidePanel(e: MouseEvent) {
        if (this.setupDone == false || !this.time) return;

        let ignore = false;
        //@ts-ignore
        e?.path?.forEach((p) => {
            if (p?.classList?.contains("v-menu__content")) ignore = true;
        });
        if (ignore) return;

        this.time = null;
    }
    public onFocusDesc(e: FocusEvent | MouseEvent) {
        if (e.type == "focus") this.openLastTimes = true;
        else this.openLastTimes = false;
    }

    public async onSelectLastT(i: CustomItem) {
        const t = i.obj as RxTimeDocument;
        if (t) {
            this.setupDone = false;

            this.description = t.title;

            if (t.isPersonal) {
                this.task = null;
            } else {
                this.task = await t.taskId_!;
            }
            this.setupDone = true;
        }
        this.openLastTimes = false;
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
            .then(async (times) => {
                this.lastTimes = [];
                const filters: string[] = [];
                const items = await Promise.all(
                    times.map(async (i) => {
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

                        return {
                            id: i.id,
                            type: "time",
                            title: title,
                            obj: i,
                        };
                    })
                );
                //@ts-ignore
                this.lastTimes = items.filter(function(el: CustomItem) {
                    return el != null;
                });
            });
    }

    public beforeDestroy() {
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
        
        this.task = null;

        if (this.time.taskId && this.time.taskId != "0") {
            this.task = await this.time.taskId_!
        }

        this.setupDone = true;
    }

    public async updateTime() {
        if (!this.time) return;

        const secStart = this.hmToSecondsOnly(this.start);
        const secEnd = this.hmToSecondsOnly(this.end);
        const duration = secEnd - secStart;

        const dateDay = new Date(this.date);
        dateDay.setUTCHours(0, 0, secStart, 0);
        const tsDay = parseInt("" + dateDay.getTime() / 1000, 10);

        const taskId = this.taskId;

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
            cursor: pointer;

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
    ::v-deep .v-autocomplete {
         .v-select__slot {
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
