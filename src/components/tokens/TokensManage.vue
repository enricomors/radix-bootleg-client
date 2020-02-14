<template>
  <section class="section">
    <h2 class="title">Manage Bootlegs</h2>
    <b-table
      :data="bootlegs"
      :paginated="bootlegs.size > pageSize"
      :per-page="pageSize"
      ref="table"
      hoverable
      detailed
      detail-key="description"
      show-detail-icongetTokenUnitsGranularity
    >
      <template slot-scope="props">
        <b-table-column width="30">
          <div v-if="props.row.iconUrl" class="image is-24x24"><img :src="props.row.iconUrl" alt="" /></div>
        </b-table-column>
        <b-table-column field="symbol" label="Symbol" width="150" sortable>
          {{ getSymbol(props.row.tokenUri) }}
        </b-table-column>
        <b-table-column field="title" label="Title" sortable>
          {{ props.row.title }}
        </b-table-column>
        <b-table-column field="price" label="Price" sortable>
          {{ props.row.price }}
        </b-table-column>
        <b-table-column label="Actions">
          <div class="buttons">
            <b-button
              v-if="tokenDefinitions.has(props.row.tokenUri)"
              type="is-info"
              class="has-padding-right-30 has-padding-left-30"
              icon-left="leaf"
              @click="watch()"
            >
              Watch
            </b-button>
            <b-button
              v-else
              type="is-success"
              class="has-padding-right-30 has-padding-left-30"
              icon-left="fire"
              @click="buy()"
            >
              Buy
            </b-button>
          </div>
        </b-table-column>
      </template>

      <template slot="detail" slot-scope="props">
        <table class="table" aria-colspan="4">
          <tr>
            <td class="has-text-weight-bold">Token RRI</td>
            <td>{{ props.row.tokenUri }}</td>
          </tr>
          <tr>
            <td class="has-text-weight-bold">Artist address</td>
            <td>{{ props.row.artist }}</td>
          </tr>
          <tr>
            <td class="has-text-weight-bold">Description</td>
            <td>{{ props.row.description }}</td>
          </tr>
        </table>
      </template>

      <template slot="empty">
        <table-empty />
      </template>
    </b-table>
  </section>
</template>

<script lang="ts">
import Vue from 'vue';
import { RadixIdentity, RadixTokenDefinition, RadixTransactionBuilder } from 'radixdlt';
import { Subscription } from 'rxjs';
import Decimal from 'decimal.js';
import TokensManageActionModal from '@/components/tokens/TokensManageModal.vue';
import { NotificationType } from '@/constants';
import TableEmpty from '@/components/shared/TableEmpty.vue';

import axios from 'axios';

export default Vue.extend({
  name: 'TokensManage',
  components: {
    'table-empty': TableEmpty,
  },
  data() {
    return {
      bootlegs: [],
      tokenSymbols: [String],
      pageSize: 10,
      tokenDefinitions: new Map<string, RadixTokenDefinition>(),
      tokenUpdatesSubscription: Subscription.EMPTY as Subscription,
      tokenUpdatesTracker: 1,
    };
  },
  created() {
    if (this.identity) {
      this.loadTokenDefinitions();
      this.subscribeToUpdates();
      this.loadBootlegsFromDb();
    }
  },
  beforeDestroy() {
    this.tokenUpdatesSubscription.unsubscribe();
  },
  watch: {
    identity(newValue, oldValue) {
      this.loadTokenDefinitions();
      this.subscribeToUpdates();
      this.loadBootlegsFromDb();
    },
  },
  computed: {
    identity(): RadixIdentity {
      return this.$store.state.identity;
    },
    tokenDefinitionsData(): any {
      return this.tokenUpdatesTracker && Array.from(this.tokenDefinitions.values());
    },
  },
  methods: {
    loadTokenDefinitions() {
      this.identity.account.tokenDefinitionSystem.tokenDefinitions
        .values()
        .map(td => this.tokenDefinitions.set(this.getTokenRRI(td), td));
    },
    subscribeToUpdates() {
      this.tokenUpdatesSubscription = this.identity.account.tokenDefinitionSystem
        .getAllTokenDefinitionObservable()
        .subscribe(td => {
          this.tokenDefinitions.set(this.getTokenRRI(td), td);
          this.tokenUpdatesTracker += 1;
        });
    },
    loadBootlegsFromDb() {
      axios.get('http://localhost:3001/bootlegs')
      .then((response) => {
        if (response.status === 400) {
          console.error('Error fetching bootlegs from db')
        } else {
          this.bootlegs = response.data
          console.log('Bootlegs successfully fetched from db')
        }
      })
    },
    buy() {

    },
    watch() {

    },
    openModal(tokenReference: string, action: string) {
      this.$buefy.modal.open({
        parent: this,
        component: TokensManageActionModal,
        hasModalCard: true,
        trapFocus: true,
        ariaModal: true,
        ariaRole: 'dialog',
        props: {
          tokenRRI: tokenReference,
          tokenAction: action,
        },
      });
    },
    getSymbol(uri: string) {
      return uri.split('/')[2];
    },
    getTokenRRI(td: RadixTokenDefinition) {
      return '/' + td.address + '/' + td.symbol;
    },
    hasTokenDefinition(tokenUri: string) {
      return this.tokenDefinitions.has(tokenUri)
    },
    showStatus(message: string, type?: string) {
      this.$parent.$emit('show-notification', message, type);
    },
  },
});
</script>
