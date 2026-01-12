<template>
  <div id="app" class="text-black">
    <div class="flex h-screen">
      <transition name="component-fade" mode="out-in">
        <div
          v-if="bypassWelcome"
          key="spinner"
          class="w-full h-screen mb-12 flex items-center justify-center text-lead-600"
        >
          <Spinner size="64" />
        </div>
        <Home v-else-if="user" />
        <Welcome
          v-else
          :justLoggedOut="justLoggedOut"
          class="w-full lg:m-auto lg:w-auto"
        />
      </transition>
      <Toaster />
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue, Watch } from 'vue-property-decorator';
import Spinner from './components/generic/Spinner.vue';
import Home from './components/Home.vue';
import Welcome from './components/Welcome.vue';
import Toaster from './components/Toaster.vue';
import { getModule } from 'vuex-module-decorators';
import MainModule from './store/modules/MainModule';
import { User, Credentials, AuthenticatableSource } from 'ganttlab-entities';
import LocalForage, {
  getRememberedCredentials,
  getRememberedSource,
} from './helpers/LocalForage';
import { getBySlug } from './helpers/ImplementedSourcesGateways';
import { SignIn } from './helpers/SignIn';
import { trackInteractionEvent } from './helpers/GTM';
import { parseUrlState } from './helpers/UrlStateParser';

const mainState = getModule(MainModule);

@Component({
  components: {
    Spinner,
    Home,
    Welcome,
    Toaster,
  },
})
export default class App extends Vue {
  private bypassWelcome = true;

  get justLoggedOut(): boolean {
    return mainState.justLoggedOut;
  }

  get user(): User | null {
    return mainState.user;
  }

  @Watch('user')
  onUserChange(user: User | null) {
    if (user && !this.justLoggedOut) {
      // user is set, let's proceed!
      this.bypassWelcome = false;
    }
  }

  async mounted() {
    if (this.justLoggedOut) {
      this.bypassWelcome = false;
      return;
    }

    // PRIORITY 1: Check for URL state (takes precedence over localStorage)
    const urlState = parseUrlState();
    if (urlState) {
      console.log('🔗 URL state detected - will use URL parameters instead of localStorage');
      mainState.setUrlState(urlState);
    }

    // when mounted, fill vuex store with remembered data
    mainState.setCredentialsBySource(await getRememberedCredentials());
    mainState.setRemember(await LocalForage.getItem('remember'));

    // Determine which source to use for authentication
    // Priority: remembered source (if remember=true) > URL source
    // URL state is ONLY for display configuration, NOT authentication
    let sourceToUse: string | null = null;
    let authSource: 'remembered' | 'url' | 'none' = 'none';

    // PRIORITY 1: Check remembered source if remember is enabled
    if (mainState.remember) {
      const rememberedSource = await getRememberedSource();
      if (rememberedSource) {
        sourceToUse = rememberedSource;
        authSource = 'remembered';
        console.log('💾 Using remembered source for auth:', sourceToUse);
      }
    }

    // PRIORITY 2: If no remembered source, check URL source
    if (!sourceToUse && urlState?.source) {
      sourceToUse = urlState.source;
      authSource = 'url';
      console.log('🔗 Using source from URL (no remembered source):', sourceToUse);
    }

    // Attempt auto-login if we have a source and credentials
    if (sourceToUse && authSource !== 'none') {
      const credentials: Credentials | null = mainState.getSourceCredentials(
        sourceToUse,
      );
      
      if (credentials) {
        const sourceGateway = getBySlug(sourceToUse);
        if (sourceGateway) {
          if (sourceGateway instanceof AuthenticatableSource) {
            // Validate sourceUrl only if it's explicitly provided in URL AND different from credentials
            // This prevents unnecessary re-authentication when URL changes other parameters
            if (urlState?.sourceUrl) {
              const credentialUrl = sourceGateway.getUrl();
              if (credentialUrl && credentialUrl !== urlState.sourceUrl) {
                console.log('⚠️ Source URL from URL does not match credentials');
                console.log('  Credential URL:', credentialUrl);
                console.log('  URL parameter:', urlState.sourceUrl);
                console.log('  Skipping auto-login - user needs to authenticate with correct source');
                this.bypassWelcome = false;
                return;
              }
            }
            
            // Auto-login with remembered or URL source
            await SignIn(sourceGateway, credentials);
            trackInteractionEvent(
              'Authentication',
              authSource === 'url' ? 'Bypassed Welcome (URL)' : 'Bypassed Welcome',
              sourceGateway.slug,
            );
            this.bypassWelcome = false;
          } else {
            mainState.setSourceGateway(sourceGateway);
            trackInteractionEvent(
              'Authentication',
              authSource === 'url' ? 'Bypassed Welcome (URL)' : 'Bypassed Welcome',
              sourceGateway.slug,
            );
            this.bypassWelcome = false;
          }
        } else {
          console.log('⚠️ Source gateway not found:', sourceToUse);
          this.bypassWelcome = false;
        }
      } else {
        console.log('⚠️ No credentials found for source:', sourceToUse);
        this.bypassWelcome = false;
      }
    } else {
      console.log('ℹ️ No source to use for auto-login');
      this.bypassWelcome = false;
    }
  }
}
</script>

<style lang="scss">
@import url('https://fonts.googleapis.com/css2?family=Anaheim&family=Quattrocento+Sans&display=swap');
body {
  @apply bg-gray-100;
}
a {
  @apply transition-colors duration-125 ease-in;
}
/* unvisited link */
a:link {
  /* @apply text-black; */
}
/* visited link */
a:visited {
  /* @apply text-black; */
}
/* mouse over link */
a:hover {
  @apply text-lead-700;
}
/* selected link */
a:active {
  @apply text-lead-600;
}

.component-fade-enter-active,
.component-fade-leave-active {
  @apply transition duration-125 ease-in;
}
.component-fade-enter, .component-fade-leave-to
/* .component-fade-leave-active below version 2.1.8 */ {
  opacity: 0;
}
</style>
