<template>
    <div v-if="times.length > 0" class="tpl-list-day">
        <div class="global">
            {{ dayName }} - {{ totalDuration }}
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
import { RxDatabase } from "rxdb";
import { Subscription } from "rxjs";
import TimeItem from "@/components/TimeListDay/TimeItem.vue";


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
            .$.subscribe((times: RxTimeDocument[]) => {
                this.times = times;
                this.calculTotal();
            });
    }

    public calculTotal() {
        let totalSec = 0;
        this.times.forEach((i) => (totalSec += parseInt(i.duration, 10)));

        const hours = Math.floor(totalSec / 3600);
        const minutes = Math.floor((totalSec - hours * 3600) / 60);

        let suf = "h";
        if (minutes < 10) suf= "h0";
        
        this.totalDuration = hours + suf + minutes;
    }

    @Watch('times')
    async onChangeTask() {
        this.calculTotal();
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
