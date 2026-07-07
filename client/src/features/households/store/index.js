import { defineStore } from "pinia";
import * as householdsApi from "../api";
import { useAuthStore } from "../../auth/store";
import { ManagerRoles } from "../constants";

export const useHouseholdsStore = defineStore("households", {
    state: () => ({
        households: [],
        members: [],
        membersLoaded: false,
        loading: false
    }),

    getters: {
        // Min medlemsrad i det aktiva hushållet (via user-id).
        myMember(state) {
            const auth = useAuthStore();

            return state.members.find((member) => member.userId === auth.user?.id) || null;
        },

        isManager() {
            return Boolean(this.myMember && ManagerRoles.includes(this.myMember.role));
        },

        membersById(state) {
            return new Map(state.members.map((member) => [member.id, member]));
        }
    },

    actions: {
        async fetchMembers(force = false) {
            if (this.membersLoaded && !force) {
                return;
            }

            const { members } = await householdsApi.getMembers();
            this.members = members;
            this.membersLoaded = true;
        },
        async fetchMine() {
            this.loading = true;

            try {
                const { households } = await householdsApi.getMine();
                this.households = households;
            } finally {
                this.loading = false;
            }
        },

        async create(payload) {
            await householdsApi.create(payload);
            await this.fetchMine();
        },

        async join(inviteCode) {
            await householdsApi.join(inviteCode);
            await this.fetchMine();
        },

        // Valet ligger i sessionen på servern — auth-storen uppdateras
        // så att guards och UI direkt ser det nya aktiva hushållet.
        // Medlemslistan nollställs eftersom den hör till förra hushållet.
        async select(householdId) {
            await householdsApi.select(householdId);

            this.members = [];
            this.membersLoaded = false;

            const auth = useAuthStore();
            await auth.refresh();
        }
    }
});
