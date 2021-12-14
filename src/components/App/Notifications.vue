<template>
    <div v-if="items.length > 0" class="notifications">
        <ul class="elems">
            <li v-for="item in items" :key="item.id">
                <a href="#" v-on:click.stop.prevent="clickNotif(item.act)">{{
                    item.title
                }}</a>
            </li>
        </ul>

        <v-badge class="icon" overlap color="red" :content="items.length">
            <v-icon color="black">fa fa-info-circle</v-icon>
        </v-badge>
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
    RxScheduleDocument,
} from "@/RxDB";

import Config from "@/plugins/electronStore";
import DatabaseService from "@/plugins/database";
import DateConv from "@/plugins/dateConv";
import Export from "@/plugins/export";
import EventBus from "@/plugins/eventBus";
import ScheduleHelpers from "@/plugins/scheduleHelpers";

import { ipcRenderer } from "electron";
import { RxDatabase } from "rxdb";
import { Subscription } from "rxjs";

export interface CustomItem {
    id: string;
    act: string;
    title: string;
}
@Component({})
export default class Notifications extends Vue {
    private subConf: any = null;
    private items: CustomItem[] = [];

    private db!: RxDatabase<RxItemsCollections>;
    private sub: Subscription | null = null;

    public async mounted() {
        this.db = await DatabaseService.get();
        this.subConf = Config.onDidChange("today", this.newDay);
        this.newDay();
    }

    public async clickNotif(act: string) {
        if (act === "payday") {
            this.payday();
        } else if (act === "schedule") {
            await ipcRenderer.invoke("openWindow", "planning");
        }
    }

    //triggered once a day (when the first time of the day starts )
    public async newDay() {
        this.items = [];
        if (new Date().getDate() >= 27) {
            this.items.push({
                id: "0",
                act: "payday",
                title: "It's PayDay ! Générer ma feuille d'heures",
            });
        }

        await this.checkScheduleLimit();
    }

    public async checkScheduleLimit() {
        const date = new Date(),
            y = date.getFullYear(),
            m = date.getMonth();
        const firstDayCurrent = new Date(y, m, 1);
        const lastDayCurrent = new Date(y, m + 1, 1);

        const paramsTimes = {
            selector: {
                $and: [
                    { start: { $gte: firstDayCurrent.getTime() / 1000 } },
                    { isCurrent: 0 },
                    { isPersonal: 0 },
                ],
            },
        };

        if (this.sub) {
            this.sub.unsubscribe();
        }
        //Listen every time that will be added/updated this month (except for current & perso)
        this.sub = this.db.times
            .find(paramsTimes)
            .$.subscribe(async (times) => {
                //Remove all previous schedule messages

                await this.db.schedules
                    .find()
                    .exec()
                    .then(async (items) => {
                        //Get all the schedules that exced the limit
                        let newNotifSched = await Promise.all(
                            items.map(async (i) => {
                                const totalSec = await ScheduleHelpers.foundTotalTimes(
                                    firstDayCurrent,
                                    lastDayCurrent,
                                    i
                                );

                                const limitSec = i.duration * 3600;
                                if (totalSec > limitSec) {
                                    return {
                                        id: i.id,
                                        act: "schedule",
                                        title:
                                            "Temps dépassé : " +
                                            i.title +
                                            " (" +
                                            this.formatDuration(totalSec) +
                                            "/" +
                                            this.formatDuration(limitSec) +
                                            ")",
                                    };
                                }
                                return;
                            })
                        );

                        //remove the empty ones
                        //@ts-ignore
                        newNotifSched = newNotifSched.filter(function(
                            el: CustomItem
                        ) {
                            return el != null;
                        });

                        //extract the others items (not the schedules) from currents notif
                        //@ts-ignore
                        const otherNotifs = this.items.filter(function(obj) {
                            return obj.act !== "schedule";
                        });

                        //merge both (others & scheds)
                        if (newNotifSched.length + otherNotifs.length > 0) {
                            //@ts-ignore
                            this.items = [...newNotifSched, ...otherNotifs];
                        }
                    });
            });
    }

    public formatDuration(totalSec: number) {
        const hours = Math.floor(totalSec / 3600);
        const minutes = Math.floor((totalSec - hours * 3600) / 60);

        let suf = "h";
        if (minutes < 10) suf = "h0";

        return hours + suf + minutes;
    }

    public async payday() {
        const generateWorks = await Export.exportHours(
            DateConv.formatYearMonth(),
            true
        );
        let resultExport = "L'export n'a pas été généré.";
        if (generateWorks) {
            resultExport = "L'export a été généré.";
        }
        EventBus.$emit("SHOW_SNAKBAR", resultExport);
    }

    public async beforeDestroy() {
        if (this.sub) {
            this.sub.unsubscribe();
        }
    }
}
</script>

<style scoped lang="scss">
.notifications {
    position: fixed;
    bottom: 1px;
    right: 1px;
    padding: 2px;

    .icon {
        text-align: right;
        display: block;
        margin-right: 5px;
    }
    .elems {
        display: none;
        background: #f7f7f7;
        border: 1px solid #b7b7b7;
        border-radius: 5px;
        margin: 0;
        margin-bottom: 4px;
        padding: 5px 5px 5px 20px;
    }

    &:hover {
        .elems {
            display: block;
        }
    }
}
</style>
