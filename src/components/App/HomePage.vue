<template>
    <section class="home">
        <TimeListGlobal></TimeListGlobal>
        <div class="text-center">
            <v-btn
                v-on:click="showMore()"
                small
                color="primary"
                style="margin-bottom: 10px"
                >Afficher +</v-btn
            >
        </div>
    </section>
</template>

<script lang="ts">
import { Component, Prop, Vue, Watch } from "vue-property-decorator";

import TimeListGlobal from "@/components/HomePage/TimeListGlobal.vue";
import DatabaseService from "@/plugins/database";
import Dolibarr from "@/plugins/dolibarr";
import Config from "@/plugins/electronStore";
import EventBus from "@/plugins/eventBus";

@Component({
    components: { TimeListGlobal },
})
export default class HomePage extends Vue {
    public async mounted() {
        await this.synchro();

        EventBus.$on("APP_SYNCHRONIZE", async () => {
            await this.synchro();
        });
    }

    public showMore() {
        Config.set(
            "defaultListingLastDays",
            Config.get("defaultListingLastDays") + 7
        );
    }

    async synchro() {
        //TODO-mg use Bus emit ?
        const db = await DatabaseService.get();
        const items = await db.times
            .find({
                selector: {
                    $or: [
                        { needInsert: 1 },
                        { needUpdate: 1 },
                        { needRemove: 1 },
                    ],
                },
            })
            .exec();

        await Promise.all(
            items.map(async (i) => {
                await Dolibarr.updateDolibarr(i);
            })
        );

        const syncs = [
            Dolibarr.getClients(),
            Dolibarr.getProjects(),
            Dolibarr.getTasks(),
            Dolibarr.getTimes(),
        ];

        await Promise.all(syncs).then(function(results) {
            console.log("[HP] Sync done");
            EventBus.$emit("APP_SYNCHRONIZE_DONE");
        });
    }
}
</script>

<style scoped lang="scss">
.home {
    background-color: #f7f7f7;
}
</style>
