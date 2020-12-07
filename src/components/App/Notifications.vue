<template>
    <div v-if="items.length > 0" class="notifications">
        <ul class="elems">
            <li v-for="item in items" :key="item.act">
                <a href="#" v-on:click="clickNotif(item.act)">{{
                    item.title
                }}</a>
            </li>
        </ul>

        <v-badge class="icon" overlap color="green" :content="items.length">
            <v-icon color="black">fa fa-info-circle</v-icon>
        </v-badge>
    </div>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";

import Config from "@/plugins/electronStore";
import DateConv from "@/plugins/dateConv";
import Export from "@/plugins/export";
import EventBus from "@/plugins/eventBus";

export interface CustomItem {
    act: any;
    title: string;
}
@Component({})
export default class Notifications extends Vue {
    private subConf: any = null;
    private items: CustomItem[] = [];

    public mounted() {
        this.subConf = Config.onDidChange("today", this.newDay);
        this.newDay();
    }

    public async clickNotif(act: string) {
        if (act === "payday") {
            this.payday();
        }
    }

    public newDay() {
        this.items = [];
        if (new Date().getDate() == 27) {
            this.items.push({
                act: "payday",
                title: "It's PayDay ! Générer ma feuille d'heures",
            });
        }
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
