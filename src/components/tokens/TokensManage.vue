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
              @click="confirmBootlegPurchase(props.row)"
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
import { RadixIdentity, RadixTokenDefinition, RadixTransactionBuilder, RadixAccount, RRI, RadixAddress, radixUniverse } from 'radixdlt';
import { Subscription } from 'rxjs';
import Decimal from 'decimal.js';
import BN from 'bn.js'
import TokensManageActionModal from '@/components/tokens/TokensManageModal.vue';
import { NotificationType } from '@/constants';
import TableEmpty from '@/components/shared/TableEmpty.vue';

import axios from 'axios';
import bodyParser from 'body-parser';

export default Vue.extend({
  name: 'TokensManage',
  components: {
    'table-empty': TableEmpty,
  },
  data() {
    return {
      bootlegs: [],
      pageSize: 10,
      tokenDefinitions: new Map<string, RadixTokenDefinition>(),
      tokenUpdatesSubscription: Subscription.EMPTY as Subscription,
      tokenRequestSubscription: Subscription.EMPTY as Subscription,
      tokenUpdatesTracker: 1,
    };
  },
  created() {
    if (this.identity) {
      this.loadTokenDefinitions();
      this.subscribeToUpdates();
      this.subscribeToTokenReqs();
      this.loadBootlegsFromDb();
    }
  },
  beforeDestroy() {
    this.tokenUpdatesSubscription.unsubscribe();
    this.tokenRequestSubscription.unsubscribe();
  },
  watch: {
    identity(newValue, oldValue) {
      this.loadTokenDefinitions();
      this.subscribeToUpdates();
      this.subscribeToTokenReqs();
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
    subscribeToTokenReqs() {
      this.tokenRequestSubscription = this.identity.account.dataSystem
        .applicationDataSubject
        .subscribe(req => {
          try {
            console.log(req);
            console.log(req.data.payload.data)
            const payload = JSON.parse(req.data.payload.data)
            console.log('payload ' + payload);
            if (payload.msg === 'SEND') {
              this.sendToken(payload.uri, payload.sender)
            }
          } catch (error) {
            console.error(error.message || error)
          }
        })
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
    async buy(bootleg: any) {
      const price: BN = bootleg.price
      console.log('price is' + price.toString());
      const symbol = 'BTL'
      const tokenUri = `/${this.identity.account.getAddress}/BTL`

      const bootlegger = bootleg.bootlegger
      console.log('bootlegger ' + bootlegger);
      
      const artist = bootleg.artist
      console.log('artist ' + artist);
      
      const franchisors = bootleg.franchisors
      console.log('franchisors array ' + franchisors);
      
      // the user which is buyng the bootleg
      const newFranchisor = this.identity.account

      const funds =  newFranchisor
        .tokenDefinitionSystem
        .getTokenDefinition(symbol)
        .getTotalSupply()

      console.log('total funds: ' + funds)

      if (funds.gt(price)) {
         // send payment to server
         axios.get('http://localhost:3001/request-address')
          .then((resp) => { 
            console.log('Received server address')
            const serverAccount = resp.data.address

            const status = RadixTransactionBuilder.createTransferAtom(
              this.identity.account,
              serverAccount,
              radixUniverse.nativeToken,
              price.toNumber()
            ).signAndSubmit(this.identity)

            status.subscribe({
              next: status => this.showStatus(status),
              complete: () => { 
                this.requestToken(bootleg.bootlegger, bootleg.tokenUri)
                this.sendRecipients(artist, bootlegger, franchisors)
              },
              error: error => { this.showStatus(error, NotificationType.ERROR) }
            })

          }).catch(err => console.error(err))
         // send payload to server
      } else {
        throw new Error("Insufficent funds")
      }
    },
    requestToken(ownerAddress: string, tokenUri: string) {
      const ownerAccount = RadixAccount.fromAddress(ownerAddress)
      const payload = JSON.stringify({
        message: 'SEND',
        sender: this.identity.address,
        uri: tokenUri
      })
      
      RadixTransactionBuilder.createPayloadAtom(
        this.identity.account,
        [ownerAccount],
        'radix-bootleg',
        payload,
      ).signAndSubmit(this.identity)
    },
    sendRecipients(artist: string, bootlegger: string, franchisors: []) {
      const newFranchisor = this.identity.account

      axios.post('https://localhost:3001/send-recipients', {
        artist, bootlegger, franchisors, newFranchisor
      })
      .then()
      .catch()
    },
    sendToken(tokenUri: string, sender: string) {
      const senderAccount = RadixAccount.fromAddress(sender)
      RadixTransactionBuilder.createTransferAtom(
        this.identity.account,
        senderAccount,
        tokenUri,
        1
      ).signAndSubmit(this.identity)
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
    showStatus(message: string, type?: string) {
      this.$parent.$emit('show-notification', message, type);
    },
    confirmBootlegPurchase(bootleg: any) {
      this.$buefy.dialog.confirm({
        title: 'Purchase bootleg',
        message: `Proceeding you will purchase this bootleg.
                  <br/><br/>
                  <b>Note: </b> Be sure to have enough funds in your wallet.`,
        cancelText: 'Cancel',
        confirmText: 'Proceed',
        type: 'is-primary',
        onConfirm: () => {
          this.buy(bootleg)
            .then(() => this.showStatus('Bootleg purchased', NotificationType.SUCCESS))
            .catch(error => {
              this.showStatus(error.message || error, NotificationType.ERROR)
              console.error('Error purchasing bootleg ' + error)
            })
        },
      })
    }
  },
});
</script>
