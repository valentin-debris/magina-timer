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
    public showMore() {
        Config.set(
            "defaultListingLastDays",
            Config.get("defaultListingLastDays") + 7
        );
    }
}
</script>

<style scoped lang="scss">
.home {
    background-color: #f7f7f7;
}
</style>
