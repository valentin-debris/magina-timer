<template>
    <div v-if="times.length > 0" class="tpl-list-day">
        <div class="global">
            {{ dayName }} - {{ totalDuration }}
            <v-icon
                small
                class="mr-2"
                title="Ajouter un temps"
                @click="addOldTime()"
            >
                mdi-alarm-plus
            </v-icon>
            <!-- mdi-star-outline mdi-star -->
        </div>
        <div>
            <ul class="details">
                <li v-for="timeI in times" :key="timeI.id" class="block-filter">
                    <TimeItem :time="timeI"></TimeItem>
                </li>
            </ul>
        </div>
    </div>
</template>

<script lang="ts">
import { Component, Prop, Vue, Watch } from "vue-property-decorator";
import { RxItemsCollections, RxTimeDocument } from "@/RxDB";

import Config from "@/plugins/electronStore";
import DatabaseService from "@/plugins/database";
import DateConv from "@/plugins/dateConv";
import { RxDatabase } from "rxdb";
import { Subscription } from "rxjs";
import TimeItem from "@/components/TimeListDay/TimeItem.vue";
import EventBus from "@/plugins/eventBus";


@Component({
    components: { TimeItem },
})
export default class TimeListDay extends Vue {
    @Prop() day!: Date;
    private dayName = "";
    private totalDuration = "";

    private loading = false;
    private times: RxTimeDocument[] = [];
    private sub: Subscription | null = null;
    private db!: RxDatabase<RxItemsCollections>;
    private subConf: any = null;

    @Watch('times')
    async onChangeTask() {
        await this.calculTotal();
    }

    public async mounted() {
        const options = {
            weekday: "short",
            month: "short",
            day: "numeric",
        };
        this.dayName = this.day.toLocaleDateString("fr-FR", options);

        this.db = await DatabaseService.get();

        this.subConf = Config.onDidChange('personalOnly', this.observeTimes);
        await this.observeTimes();
    }

    public async observeTimes() {
        const ttStart = this.day.getTime() / 1000;
        const ttEnd = ttStart + 24 * 3600;
        const paramsTimes = {
            selector: {
                $and: [
                    { start: { $gte: ttStart } },
                    { start: { $lte: ttEnd } },
                    { isCurrent: 0 }
                ],
            },
        };

        if (Config.get("personalOnly")) {
            // @ts-ignore
            paramsTimes.selector.$and.push({ isPersonal: 1 });
        }

        if (this.sub) {
            this.sub.unsubscribe();
        }

        this.sub = this.db.times
            .find(paramsTimes)
            .sort({ start: "desc" })
            .$.subscribe(async (times: RxTimeDocument[]) => {
                this.times = times;
                await this.calculTotal();
            });
    }

    public async calculTotal() {
        let totalSec = 0;
        this.times.forEach((i) => (totalSec += parseInt(i.duration, 10)));

        const hours = Math.floor(totalSec / 3600);
        const minutes = Math.floor((totalSec - hours * 3600) / 60);
        let suf = "h";
        if (minutes < 10) suf= "h0";

        const monday = this.getMonday(new Date(this.day));
        const ttStart = monday.getTime() / 1000;
        const ttEnd = this.day.getTime() / 1000 + 24 * 3600;

        const items = await this.db.times
                .find({
                    selector: {
                        $and: [
                            {
                                start: {
                                    $gte: Math.trunc(ttStart),
                                },
                            },
                            {
                                start: {
                                    $lte: Math.trunc(ttEnd),
                                },
                            },
                        ],
                    },
                })
                .exec();
        
        let totalWeek = 0;
        items.forEach(i => {
            totalWeek+= parseInt(i.duration);
        });
        const hoursW = Math.floor(totalWeek / 3600);
        const minutesW = Math.floor((totalWeek - hoursW * 3600) / 60);
        let sufW = "h";
        if (minutesW < 10) sufW= "h0";

        this.totalDuration = hours + suf + minutes + " (" + hoursW + sufW + minutesW + ")";
    }

    public getMonday(d: Date) {
        d = new Date(d);
        const day = d.getDay(),
            diff = d.getDate() - day + (day == 0 ? -6:1); // adjust when day is sunday
        return new Date(d.setDate(diff));
    }

    public async addOldTime() {
        const obj = DatabaseService.getNewTimeObj();
        obj.start = DateConv.timeUTC(this.day);
        obj.isPersonal = 1;
        obj.title = "";

        const time = await this.db.times.insert(obj);

        EventBus.$emit('TOGGLE_PAN', time);
        return;
    }

    public beforeDestroy() {
        if (this.sub) {
            this.sub.unsubscribe();
        }
        if(this.subConf) {
            this.subConf();
        }
    }
}
</script>

<style scoped lang="scss">
.tpl-list-day {
    //List for a day with summary
    margin: 0 10px;
    margin-bottom: 5px;
    .global {
        position: sticky;
        top: 67px;
        font-weight: bold;
        color: var(--v-primary-base);
        margin-bottom: 5px;
        background-color: #f7f7f7;
    }

    ul.details {
        //List for a day
        padding: 5px;
        list-style: none;
    }
}
</style>
