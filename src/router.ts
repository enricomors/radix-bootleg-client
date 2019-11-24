import Vue from 'vue';
import Router from 'vue-router';
import Balance from './views/wallet/WalletBalance.vue';
import Transactions from './views/wallet/WalletTransactions.vue';
import Send from './views/wallet/WalletSendTokens.vue';
import DataWrite from './views/data/DataWrite.vue';
import DataRead from './views/data/DataRead.vue';
import TokensCreate from '@/views/tokens/TokensCreate.vue';
import TokensManage from '@/views/tokens/TokensManage.vue';
import TokensLookup from '@/views/tokens/TokensLookup.vue';

Vue.use(Router);

export default new Router({
  linkExactActiveClass: 'is-active',
  routes: [
    {
      path: '/',
      redirect: '/about',
    },
    {
      path: '/tokens',
      name: 'Tokens',
      children: [
        {
          path: 'create',
          name: 'Create',
          component: TokensCreate,
        },
        {
          path: 'manage',
          name: 'Manage',
          component: TokensManage,
        },
        {
          path: 'lookup',
          name: 'Lookup',
          component: TokensLookup,
        },
      ],
      component: { render: c => c('router-view') },
    },
    {
      path: '/wallet',
      name: 'Wallet',
      children: [
        {
          path: 'balance',
          name: 'Balance',
          component: Balance,
        },
        {
          path: 'transactions',
          name: 'Transactions',
          component: Transactions,
        },
        {
          path: 'send-tokens',
          name: 'Send tokens',
          component: Send,
        },
      ],
      component: { render: c => c('router-view') },
    },
    {
      path: '/data',
      name: 'Data',
      children: [
        {
          path: 'read',
          name: 'Read',
          component: DataRead,
        },
        {
          path: 'write',
          name: 'Write',
          component: DataWrite,
        },
      ],
      component: { render: c => c('router-view') },
    },
    {
      path: '/about',
      name: 'About',
      // route level code-splitting
      // this generates a separate chunk (about.[hash].js) for this route
      // which is lazy-loaded when the route is visited.
      component: () => import(/* webpackChunkName: "about" */ './views/about/About.vue'),
    },
  ],
});
