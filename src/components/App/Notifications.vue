<template>
    <div v-if="displayNotif" class="notifications">
        <ul class="elems">
            <li>
                <a href="#" v-on:click="payday()"
                    >It's PayDay ! Générer ma feuille d'heures</a
                >
            </li>
        </ul>
        <div class="icon">
            <i class="fa fa-info-circle"></i
            ><sup style="font-size: 10px;">(1)</sup>
        </div>
    </div>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";

import Config from "@/plugins/electronStore";
import DateConv from "@/plugins/dateConv";
import Export from "@/plugins/export";

@Component({})
export default class Notifications extends Vue {
    private subConf: any = null;
    private displayNotif = false;

    public mounted() {
        this.subConf = Config.onDidChange("today", this.newDay);
        this.newDay();
    }

    public newDay() {
        this.displayNotif = new Date().getDate() == 27;
    }

    public async payday() {
        await Export.exportHours(DateConv.formatYearMonth(), true);
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
