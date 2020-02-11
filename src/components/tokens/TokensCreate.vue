<template>
  <section class="section" v-if="identity">
    <h2 class="title">Create New Bootleg</h2>
    <div class="form">
      <b-field grouped>
        <b-field label="Symbol">
          <b-input v-model="symbol" placeholder="QWMBL" />
        </b-field>
        <b-field label="Title" expanded>
          <b-input v-model="title" placeholder="Queen - Live At Wembley (1986)" />
        </b-field>
      </b-field>

      <b-field label="Artist">
        <b-input v-model="artist" placeholder="Artist public address"/>
      </b-field>

      <b-field label="Description">
        <b-input v-model="description" placeholder="Concert at the original Wembley Stadium, on Saturday 12 July 1986 during Queen's Magic Tour"></b-input>
      </b-field>

      <b-field grouped>
        <b-field label="Price">
          <b-input type="number" v-model="price" :use-html5-validation="false"></b-input>
        </b-field>
        <b-field label="Icon URL (optional)" expanded>
          <b-input v-model="iconUrl"></b-input>
        </b-field>
      </b-field>

      <hr>

      <b-field>
        <div class="footer-row">
          <b-button @click="handleClear" type="is-secondary">Clear</b-button>
          <b-button
            @click="handleBootlegCreation"
            type="is-primary"
            :disabled="!(this.symbol && this.title && this.artist && this.description && this.price > 0)">
            Create Token
          </b-button>
          <div class="glue"></div>
        </div>
      </b-field>

    </div>
  </section>
</template>

<script lang="ts">
import { RadixTransactionBuilder, RadixIdentity } from 'radixdlt';
import Vue from 'vue';
import { NotificationType } from '@/constants';
import { Decimal } from 'decimal.js';

const defaultIconURL = 'https://i.imgur.com/mP71VI7.png';

export default Vue.extend({
  name: 'TokensCreate',
  data() {
    return {
      symbol: '',
      title: '',
      artist: '',
      description: '',
      price: '1',
      granularity: '1',
      amount: '1',
      iconUrl: '',
      isAmountValid: true,
    };
  },
  computed: {
    identity(): RadixIdentity {
      return this.$store.state.identity;
    },
  },
  methods: {
    handleBootlegCreation() {
      this.isAmountValid = this.validateAmount();

      if (!this.isAmountValid) return;

      try {
        const transactionBuilder = new RadixTransactionBuilder();
        this.defineToken(transactionBuilder.createTokenSingleIssuance.bind(transactionBuilder));
      } catch (e) {
        this.showStatus(e.message, NotificationType.ERROR);
      }
    },
    handleClear() {
      this.symbol = '';
      this.title = '';
      this.artist = '';
      this.price = '1';
      this.description = '';
      this.granularity = '1';
      this.amount = '1';
      this.iconUrl = '';
    },
    showStatus(message: string, type?: string) {
      this.$parent.$emit('show-notification', message, type);
    },
    defineToken(tokenConstructor: (...args: any) => RadixTransactionBuilder) {
      tokenConstructor(
        this.identity.account,
        this.title,
        this.symbol,
        this.description,
        this.granularity,
        this.amount,
        this.iconUrl || defaultIconURL,
      )
        .signAndSubmit(this.identity)
        .subscribe({
          next: status => this.showStatus(status),
          complete: () => {
            this.showStatus('NEW BOOTLEG CREATED', NotificationType.SUCCESS);
            this.saveBootlegToDb();
          },
          error: error => this.showStatus(error.message || error, NotificationType.ERROR),
        });
    },
    saveBootlegToDb() {

    },
    validateAmount(): boolean {
      return new Decimal(this.amount).mod(new Decimal(this.granularity)).isZero();
    },
  },
});
</script>

<style scoped>
label.radio {
  padding-top: 0;
}
</style>
