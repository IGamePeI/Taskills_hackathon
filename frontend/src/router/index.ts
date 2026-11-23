import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

// подключение страниц
import HomeView from '../views/HomeView.vue'

import InstructionsView from '../views/InstructionsView.vue'
import InstructionPreviewView from '../views/InstructionPreviewView.vue'
import InstructionPassingView from '../views/InstructionPlayerView.vue'

import RegisterView from '../views/RegisterView.vue'
import LoginView from '../views/LoginView.vue'
import ProfileView from '../views/ProfileView.vue'

import MyInstructionsView from '../views/MyInstructionsView.vue'
import InstructionCreateView from '../views/InstructionCreateView.vue'
import InstructionEditView from '../views/InstructionEditView.vue'

import AnalyticsView from '../views/AnalyticsView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),

  //настройка путей
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/instructions',
      name: 'instructions',
      component: InstructionsView,
    },
    {
      path: '/instructions/:id',
      name: 'instruction-preview',
      component: InstructionPreviewView,
    },
    {
      path: '/instructions/:id/steps',
      name: 'instruction-player',
      component: InstructionPassingView,
    },
    {
      path: '/register',
      name: 'register',
      component: RegisterView,
    },
    {
      path: '/login',
      name: 'login',
      component: LoginView,
    },
    {
      path: '/profile',
      name: 'profile',
      component: ProfileView,
      meta: {
        requiresAuth: true,
      },
    },
    {
      path: '/my-instructions',
      name: 'my-instructions',
      component: MyInstructionsView,
      meta: {
        requiresAuth: true,
        requiresExpert: true,
      },
    },
    {
      path: '/instructions/create',
      name: 'instruction-create',
      component: InstructionCreateView,
      meta: {
        requiresAuth: true,
        requiresExpert: true,
      },
    },
    {
      path: '/instructions/:id/edit',
      name: 'instruction-edit',
      component: InstructionEditView,
      meta: {
        requiresAuth: true,
        requiresExpert: true,
      },
    },
    {
      path: '/instructions/:id/analytics',
      name: 'instruction-analytics',
      component: AnalyticsView,
      meta: {
        requiresAuth: true,
      },
    },
  ],
})

// проверка прав перед переходом
router.beforeEach(async (to) => {
  const authStore = useAuthStore()

  if (to.meta.requiresAuth || to.meta.requiresExpert) {
    if (!authStore.isInitialized) {
      await authStore.fetchCurrentUser()
    }

    if (!authStore.isAuthenticated) {
      return { name: 'login' }
    }
  }

  if (to.meta.requiresExpert && authStore.user?.role !== 'expert') {
    return { name: 'home' }
  }

  return true
})

export default router
