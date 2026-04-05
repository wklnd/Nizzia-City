import { createRouter, createWebHistory } from 'vue-router'

const Home = () => import('../pages/Home.vue')
const Gym = () => import('../pages/Gym.vue')
const City = () => import('../pages/City.vue')
const Inventory = () => import('../pages/Inventory.vue')
const Money = () => import('../pages/Money.vue')
const Casino = () => import('../pages/Casino.vue')
const Job = () => import('../pages/Job.vue')
const Education = () => import('../pages/Education.vue')
const Stocks = () => import('../pages/Stocks.vue')
const Crimes = () => import('../pages/Crimes.vue')
const CrimeSearchForCash = () => import('../pages/crime/SearchForCash.vue')
const CrimePickpocket = () => import('../pages/crime/Pickpocket.vue')
const Jail = () => import('../pages/Jail.vue')
const Property = () => import('../pages/Property.vue')
const Bank = () => import('../pages/Bank.vue')
const Profile = () => import('../pages/Profile.vue')
const HallOfFame = () => import('../pages/HallOfFame.vue')
const RealEstate = () => import('../pages/RealEstate.vue')
const Pets = () => import('../pages/Pets.vue')
const Market = () => import('../pages/Market.vue')
const Vault = () => import('../pages/Vault.vue')
const Grow = () => import('../pages/Grow.vue')
const Cartel = () => import('../pages/Cartel.vue')
const Admin = () => import('../pages/Admin.vue')
const News = () => import('../pages/News.vue')
const Rules = () => import('../pages/Rules.vue')
const Credits = () => import('../pages/Credits.vue')
const Offline = () => import('../pages/Offline.vue')


// Auth
const Login = () => import('../pages/auth/Login.vue')
const Register = () => import('../pages/auth/Register.vue')
const CreatePlayer = () => import('../pages/auth/CreatePlayer.vue')

const routes = [
  { path: '/auth/login', name: 'login', component: Login, meta: { public: true, hideChrome: true } },
  { path: '/auth/register', name: 'register', component: Register, meta: { public: true, hideChrome: true } },
  { path: '/auth/create-player', name: 'create-player', component: CreatePlayer, meta: { hideChrome: true } },
  { path: '/offline', name: 'offline', component: Offline, meta: { public: true, hideChrome: true } },

  { path: '/', name: 'home', component: Home, meta: { section: 'Progression', title: 'Home' } },
  { path: '/gym', name: 'gym', component: Gym, meta: { section: 'Activities', title: 'Gym' } },
  { path: '/city', name: 'city', component: City, meta: { section: 'Activities', title: 'City' } },
  { path: '/inventory', name: 'inventory', component: Inventory, meta: { section: 'Progression', title: 'Inventory' } },
  { path: '/money', name: 'money', component: Money, meta: { section: 'Economy', title: 'Money' } },
  { path: '/casino', name: 'casino', component: Casino, meta: { section: 'Activities', title: 'Casino' } },
  { path: '/job', name: 'job', component: Job, meta: { section: 'Activities', title: 'Job' } },
  { path: '/education', name: 'education', component: Education, meta: { section: 'Activities', title: 'Education' } },
  { path: '/stocks', name: 'stocks', component: Stocks, meta: { section: 'Economy', title: 'Stocks' } },
  { path: '/crimes', name: 'crimes', component: Crimes, meta: { section: 'Crime', title: 'Crimes' } },
  { path: '/crimes/search-for-cash', name: 'crime-search-for-cash', component: CrimeSearchForCash, meta: { section: 'Crime', title: 'Search for Cash' } },
  { path: '/crimes/pickpocket', name: 'crime-pickpocket', component: CrimePickpocket, meta: { section: 'Crime', title: 'Pickpocket' } },
  { path: '/jail', name: 'jail', component: Jail, meta: { section: 'Penalty', title: 'Jail' } },
  { path: '/property', name: 'property', component: Property, meta: { section: 'Economy', title: 'Property' } },
  { path: '/bank', name: 'bank', component: Bank, meta: { section: 'Economy', title: 'Bank' } },
  { path: '/profile', name: 'profile', component: Profile, meta: { section: 'Social', title: 'Profile' } },
  { path: '/profile/:id', name: 'profile-id', component: Profile, meta: { section: 'Social', title: 'Profile' } },
  { path: '/hall-of-fame', name: 'hall-of-fame', component: HallOfFame, meta: { section: 'Social', title: 'Hall of Fame' } },
  { path: '/real-estate', name: 'real-estate', component: RealEstate, meta: { section: 'Economy', title: 'Real Estate' } },
  { path: '/pets', name: 'pets', component: Pets, meta: { section: 'Social', title: 'Pets' } },
  { path: '/market', name: 'market', component: Market, meta: { section: 'Economy', title: 'Market' } },
  { path: '/vault', name: 'vault', component: Vault, meta: { section: 'Progression', title: 'Vault' } },
  { path: '/grow', name: 'grow', component: Grow, meta: { section: 'Crime', title: 'Grow Operation' } },
  { path: '/cartel', name: 'cartel', component: Cartel, meta: { section: 'Crime', title: 'Drug Empire' } },
  { path: '/admin', name: 'admin', component: Admin, meta: { section: 'Control', title: 'Admin' } },
  { path: '/news', name: 'news', component: News, meta: { section: 'Social', title: 'News' } },
  { path: '/rules', name: 'rules', component: Rules, meta: { section: 'Social', title: 'Rules' } },
  { path: '/credits', name: 'credits', component: Credits, meta: { section: 'Social', title: 'Credits' } },
  { path: '/:pathMatch(.*)*', redirect: '/' },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to) => {
  if (to.meta?.public) return true
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('nc_token') : null
  if (!token) return { name: 'login', query: { next: to.fullPath } }

  try {
    const cached = JSON.parse(localStorage.getItem('nc_player') || 'null')
    const jailed = !!cached?.jailed && Number(cached?.jailTime || 0) > 0
    if (jailed && to.name !== 'jail') {
      return { name: 'jail' }
    }
  } catch {
    // ignore malformed cache
  }

  return true
})

export default router
