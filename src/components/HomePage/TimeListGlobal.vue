<template>
    <div>
        <ul v-if="days" class="detailsGlobal">
            <li v-for="dayI in days" :key="dayI.getTime()" class="block-filter">
                <TimeListDay :day="dayI"></TimeListDay>
            </li>
        </ul>
        <span v-else>Chargement en cours..</span>
    </div>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import { RxItemsCollections, RxTimeDocument } from "@/RxDB";

import Config from "@/plugins/electronStore";
import { RxDatabase } from "rxdb";
import { Subscription } from "rxjs";
import TimeListDay from "@/components/TimeListGlobal/TimeListDay.vue";

@Component({
    components: { TimeListDay },
})
export default class TimeListGlobal extends Vue {
    private loading = false;
    private times: RxTimeDocument[] = [];
    private sub: Subscription | null = null;
    private db!: RxDatabase<RxItemsCollections>;
    private days: Date[] = [];
    private subConf: any = null;
    private subConf2: any = null;

    public async mounted() {
        this.subConf = Config.onDidChange(
            "defaultListingLastDays",
            this.changeListingDay
        );
        this.subConf2 = Config.onDidChange("today", this.newDay);
        this.changeListingDay();
    }

    public beforeDestroy() {
        if (this.sub) {
            this.sub.unsubscribe();
        }
        if (this.subConf) {
            this.subConf();
        }
        if (this.subConf2) {
            this.subConf2();
        }
    }

    //Refresh when it's a new day (trigger when start)
    public newDay() {
        this.changeListingDay();
    }

    public changeListingDay(nbDays?: number | null) {
        if (!nbDays) nbDays = Config.get("defaultListingLastDays");

        const tmpDays = [];
        for (let i = 0; i < nbDays; i++) {
            const limitStart = new Date();
            limitStart.setDate(limitStart.getDate() - i);
            limitStart.setHours(0, 0, 0, 0);
            tmpDays.push(limitStart);
        }
        if (tmpDays != this.days) {
            this.days = tmpDays;
        }
    }
}
</script>

<style scoped lang="scss">
.detailsGlobal {
    padding: 5px;
    list-style: none;
}
</style>
