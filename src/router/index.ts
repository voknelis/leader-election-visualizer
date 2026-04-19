import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'demo', component: { render: () => null } },
    { path: '/learning', name: 'learning', component: { render: () => null } },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

export default router
