<template>
  <section class="section" v-if="identity">
    <h2 class="title">Create New Bootleg</h2>
    <div class="form">
      <b-field grouped>
        <b-field label="Symbol">
          <b-input v-model="symbol" placeholder="BTC" />
        </b-field>
        <b-field label="Name" expanded>
          <b-input v-model="name" placeholder="Bitcoin" />
        </b-field>
      </b-field>

      <b-field label="Artist">
        <b-input v-model="artist" placeholder="Artist address"/>
      </b-field>

      <b-field label="Description">
        <b-input v-model="description" placeholder="A blockchain based decentralized digital currency token"></b-input>
      </b-field>

      <b-field grouped>
        <b-field label="Granularity">
          <b-input type="number" v-model="granularity" :use-html5-validation="false"></b-input>
        </b-field>
        <b-field
          label="Amount"
          expanded
          :type="isAmountValid ? 'is-normal' : 'is-danger'"
          :message="isAmountValid ? null : `Amount has to be a multiple of token's granularity`"
        >
          <b-input type="number" v-model="amount" :use-html5-validation="false"></b-input>
        </b-field>
      </b-field>

      <b-field label="Icon URL">
        <b-input v-model="iconUrl"></b-input>
      </b-field>

      <hr>

      <b-field>
        <div class="footer-row">
          <b-button @click="handleClear" type="is-secondary">Clear</b-button>
          <b-button
            @click="handleBootlegCreation"
            type="is-primary"
            :disabled="!(this.symbol && this.name && this.description && this.amount > 0 && this.granularity > 0)">
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
      name: '',
      artist: '',
      description: '',
      granularity: '1',
      amount: '100',
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
      this.name = '';
      this.artist = '';
      this.description = '';
      this.granularity = '1';
      this.amount = '100';
      this.iconUrl = '';
    },
    showStatus(message: string, type?: string) {
      this.$parent.$emit('show-notification', message, type);
    },
    defineToken(tokenConstructor: (...args: any) => RadixTransactionBuilder) {
      tokenConstructor(
        this.identity.account,
        this.name,
        this.symbol,
        this.description,
        this.granularity,
        this.amount,
        this.iconUrl || defaultIconURL,
      )
        .signAndSubmit(this.identity)
        .subscribe({
          next: status => this.showStatus(status),
          complete: () => this.showStatus('NEW BOOTLEG CREATED', NotificationType.SUCCESS),
          error: error => this.showStatus(error.message || error, NotificationType.ERROR),
        });
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
