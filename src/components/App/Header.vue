<template>
    <div class="header">
        <div class="connect"></div>
        <div class="current">
            <div class="bloc-c">
                <template v-if="time">
                    <div class="titleT">
                        <v-text-field
                            placeholder="Modifier la description"
                            hide-details="auto"
                            v-model="title"
                            class="tf-desc"
                            @focus="onFocusDesc"
                            @blur="onFocusDesc"
                        ></v-text-field>
                        <div
                            class="subtitle"
                            :title="subtitle"
                            v-on:click="togglePan()"
                        >
                            {{ subtitle }}
                        </div>
                    </div>
                    <div class="duration" v-on:click="togglePan()">
                        {{ duration }}
                    </div>
                </template>
                <template v-else>
                    <div class="titleT">
                        <v-text-field
                            placeholder="Démarrer une activité"
                            hide-details="auto"
                            v-model="title"
                            class="tf-desc"
                            @focus="onFocusDesc"
                            @blur="onFocusDesc"
                        ></v-text-field>
                    </div>
                    <div class="duration">--</div>
                </template>
                <div class="buttons">
                    <v-btn v-if="time" v-on:click="stopTime()" class="stop"
                        >Stop</v-btn
                    >
                    <v-btn v-else v-on:click="startTime()" class="start">
                        Start
                    </v-btn>
                </div>
            </div>
            <v-data-table
                v-if="openLastTimes"
                hide-default-footer
                hide-default-header
                :headers="headerDescs"
                :items="lastTimes"
                :search="title"
                @click:row="onSelectLastT"
            ></v-data-table>
        </div>
    </div>
</template>

<script lang="ts">
import { Component, Vue, Watch } from "vue-property-decorator";
import { RxItemsCollections, RxTimeDocument } from "@/RxDB";

import DatabaseService from "@/plugins/database";
import DateConv from "@/plugins/dateConv";
import Dolibarr from "@/plugins/dolibarr";
import EventBus from "@/plugins/eventBus";
import Config from "@/plugins/electronStore";
import { RxDatabase } from "rxdb";
import { Subscription } from "rxjs";
import TimeItem from "@/components/TimeListDay/TimeItem.vue";

export interface CustomItem {
    type: string;
    id: string;
    title: string;
    obj: RxTimeDocument;
}

@Component({
    components: { TimeItem },
})
export default class Header extends Vue {
    private time: RxTimeDocument | null = null;
    private duration = "";
    private title = "";
    private subtitle = "";
    private intervalUpdDuration: NodeJS.Timeout | null = null;

    private headerDescs = [{ text: "titre", value: "title" }];
    private lastTimes: CustomItem[] = [];
    private openLastTimes = false;

    private loading = false;
    private sub: Subscription | null = null;
    private db!: RxDatabase<RxItemsCollections>;

    public async onFocusDesc(e: FocusEvent) {
        if (e.type == "focus") this.openLastTimes = true;
        else {
            if (!this.time) {
                await this.startTime(this.title);
            } else {
                await this.time.atomicUpdate((data) => {
                    data.title = this.title;
                    return data;
                });
            }

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
            this.title = t.title;

            if (this.time) {
                await this.time.atomicUpdate((data) => {
                    data.title = this.title;
                    data.taskId = t.taskId;
                    data.isPersonal = t.isPersonal;
                    return data;
                });
                this.generateSubTitle();
            }
        }
    }

    public async mounted() {
        this.db = await DatabaseService.get();

        this.sub = this.db.times
            .findOne({
                selector: {
                    isCurrent: 1,
                },
            })
            .$.subscribe(async (time) => {
                if (time) {
                    this.time = time;
                    if (!this.intervalUpdDuration) {
                        this.intervalUpdDuration = setInterval(
                            this.updateDuration,
                            1000
                        );
                    }
                    Config.set("today", DateConv.formatFullDate());
                } else {
                    this.time = null;
                    await this.setupLastTimes();
                }
            });

        await this.setupLastTimes();
        EventBus.$on("APP_SYNCHRONIZE_DONE", async () => {
            await this.setupLastTimes();
        });
    }

    @Watch("time.title", { immediate: true })
    async onChangeTitle(item: string) {
        this.title = item;
    }
    @Watch("time.taskId", { immediate: true })
    async onChangeTask() {
        await this.generateSubTitle();
    }
    @Watch("time.isPersonal", { immediate: true })
    async onChangePerso() {
        await this.generateSubTitle();
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

    public async startTime(title = "") {
        const obj = DatabaseService.getNewTimeObj();
        obj.isPersonal = 1;
        obj.isCurrent = 1;
        obj.title = title;

        this.time = await this.db.times.insert(obj); //The insert will be trigger by this listener and the time will be pushed

        if (!this.intervalUpdDuration) {
            this.intervalUpdDuration = setInterval(this.updateDuration, 1000);
        }
    }

    public async stopTime() {
        if (this.intervalUpdDuration) {
            clearInterval(this.intervalUpdDuration);
            this.intervalUpdDuration = null;
        }
        if (!this.time) {
            return;
        }

        await this.time.atomicUpdate((data) => {
            data.isCurrent = 0;
            data.duration = DateConv.timeUTC() - this.time!.start + "";
            data.needRemove = 0;

            if (!data.isPersonal) {
                if (data.dolibarrId != "") {
                    data.needInsert = 0;
                    data.needUpdate = 1;
                } else {
                    data.needInsert = 1;
                    data.needUpdate = 0;
                }
            }
            return data;
        });

        await Dolibarr.updateDolibarr(this.time);
    }

    public async generateSubTitle() {
        if (!this.time) {
            this.subtitle = "";
            return;
        }

        let subTitle = "";

        const tk = await this.time.taskId_;
        if (tk != null) {
            subTitle = tk.title;
            const pj = await tk.projectId_;
            if (pj != null) {
                subTitle = pj.title + " | " + subTitle;
                const cl = await pj.clientId_;
                if (cl != null) {
                    subTitle = cl.title + " | " + subTitle;
                }
            }
        } else if (this.time.isPersonal) {
            subTitle = "Perso";
        } else {
            subTitle = "Non relié";
        }

        this.subtitle = subTitle;
    }

    public togglePan() {
        if (!this.time) {
            return;
        }
        setTimeout(
            function() {
                //@ts-ignore
                EventBus.$emit("TOGGLE_PAN", this.time);
            }.bind(this),
            200
        );
    }

    public updateDuration() {
        if (!this.time) return;

        const diff = (DateConv.timeUTC() - this.time.start) * 1000;
        this.duration = new Date(diff).toISOString().substr(11, 8);
    }

    public beforeDestroy() {
        if (this.sub) {
            this.sub.unsubscribe();
        }
    }
}
</script>

<style scoped lang="scss">
.header {
    padding: 8px;
    background-color: var(--v-primary-base);
    color: white;
    position: fixed;
    right: 0;
    left: 0;
    top: 0;
    z-index: 1;

    .connect {
        display: none;
        margin-bottom: 1rem;
    }

    .current {
        position: relative;

        .bloc-c {
            display: flex;
            align-items: stretch;
            overflow: hidden;
            border: 1px solid white;
            border-radius: 10px;
            min-height: 2.5rem;

            .titleT {
                height: 50px;
                padding: 5px;
                flex-grow: 1;
                overflow: hidden;

                .tf-desc {
                    ::v-deep {
                        input {
                            padding: 0;
                        }

                        .v-input__slot::before {
                            border: 0px;
                        }
                    }
                }

                .subtitle {
                    color: #d4d4d4;
                    font-size: 0.8em;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                    overflow: hidden;
                    padding-left: 10px;
                }
            }
        }

        .titleT,
        .duration {
            cursor: pointer;
        }

        .duration {
            align-items: center;
            display: flex;
            min-width: 75px;
        }

        .buttons {
            position: relative;
            width: 50px;
            button {
                height: 100%;
                width: 100%;
                min-width: auto;
                padding: 0;
                text-transform: none;
                position: absolute;
                top: 0;
                right: 0;
                color: white;
                text-decoration: none;
                border: 0px;

                &.start {
                    background-color: #ec7404;
                }
                &.stop {
                    background-color: red;
                }
            }
        }

        .v-data-table {
            position: absolute;
            z-index: 10;
            left: 0;
            right: 0;
            bottom: 0px;
            transform: translateY(100%);
            overflow-y: auto;
            max-height: 85vh;
            cursor: pointer;

            ::v-deep {
                .v-data-table__mobile-row {
                    &:hover {
                        background: #616161;
                    }
                    .v-data-table__mobile-row__cell {
                        text-align: left !important;
                    }
                }
            }
        }
    }
}
</style>
