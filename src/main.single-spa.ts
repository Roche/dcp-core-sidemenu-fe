import './single-spa/set-public-path';
import { enableProdMode, NgZone } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { Router, NavigationStart } from '@angular/router';
import { AppModule } from './app/app.module';
import { singleSpaAngular, getSingleSpaExtraProviders } from 'single-spa-angular';
import { singleSpaPropsSubject } from './single-spa/single-spa-props';
import { gxpStoreRegistration, StoreRegistrationResult, uiStore, uiStoreRegistration, userStoreRegistration } from '@open-dcp/services';
import { applyRuntimeTheme } from '@open-dcp/angular-services';
import { appConfigLoader } from './app/shared/config/app-config';
import { environment } from './environments/environment';

const CONFIG_LOAD_ERROR = {
  en: { 'config-load-failed': 'Unable to load application configuration.' },
  de: { 'config-load-failed': 'Die Anwendungskonfiguration konnte nicht geladen werden.' }
};

async function appConfigInitializerFactory(): Promise<void> {
  try {
    const config = await appConfigLoader.load();
    if (config.production) {
      enableProdMode();
    }
  } catch (error) {
    const language = uiStore.getState().language === 'de' ? 'de' : 'en';
    uiStore.setMessage('error', CONFIG_LOAD_ERROR[language]['config-load-failed']);
    throw error;
  }
}

applyRuntimeTheme({ logPrefix: '[Side-menu]' });

type RegistrationEnvelope = {
  registration: StoreRegistrationResult;
};

export async function initializeRegistrationState(
  registrationPromise: Promise<RegistrationEnvelope>
): Promise<void> {
  const { registration } = await registrationPromise;

  if (registration.status === 'rejected-incompatible-downgrade' ||
    registration.status === 'rejected-incompatible-upgrade') {
    throw new Error(`[Side-menu] Incompatible registration (${registration.status})`);
  }
}

async function registrationInitializerFactory() {
  await initializeRegistrationState(uiStoreRegistration);
  await initializeRegistrationState(userStoreRegistration);
  await initializeRegistrationState(gxpStoreRegistration);
}

let persistentAppRoot: Element | null = null;

function readRoutingUrls(event: Event): { oldUrl: string | null; newUrl: string | null } {
  const eventWithDetail = event as Event & {
    detail?: {
      oldUrl?: string;
      newUrl?: string;
    };
  };

  return {
    oldUrl: eventWithDetail.detail?.oldUrl ?? null,
    newUrl: eventWithDetail.detail?.newUrl ?? null
  };
}

function getPathSegments(url: string | null): string[] {
  if (!url) {
    return [];
  }

  try {
    return new URL(url, window.location.origin)
      .pathname
      .split('/')
      .filter(Boolean);
  } catch {
    // Fallback for malformed values that are still path-like.
    return url.split('?')[0].split('#')[0].split('/').filter(Boolean);
  }
}

function shouldSkipDomMoveForNavigation(oldUrl: string | null, newUrl: string | null): boolean {
  const oldSegments = getPathSegments(oldUrl);
  const newSegments = getPathSegments(newUrl);

  if (!oldSegments.length || !newSegments.length) {
    return false;
  }

  const oldAppIndex = oldSegments.indexOf('app');
  const newAppIndex = newSegments.indexOf('app');

  if (oldAppIndex < 0 || oldAppIndex !== newAppIndex) {
    return false;
  }

  // Compare routing section by fixed position only: /app/{context}/{section}.
  const sectionOffsetFromApp = 2;
  const oldSection = oldSegments[oldAppIndex + sectionOffsetFromApp];
  const newSection = newSegments[newAppIndex + sectionOffsetFromApp];
  return !!oldSection && oldSection === newSection;
}

function syncAppRootPosition() {
  if (!persistentAppRoot || !document.contains(persistentAppRoot)) {
    persistentAppRoot = document.querySelector('app-side-menu-root');
  }

  if (!persistentAppRoot) {
    return;
  }

  const activeContainer =
    document.querySelector('.wrapper .side-menu') ||
    document.querySelector('nav.side-menu') ||
    document.querySelector('.side-menu');

  if (activeContainer) {
    if (!activeContainer.contains(persistentAppRoot)) {
      activeContainer.appendChild(persistentAppRoot);
    }
  } else {
    document.body.appendChild(persistentAppRoot);
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('single-spa:routing-event', () => {
    setTimeout(() => {
      syncAppRootPosition();
    }, 0);
  });

  window.addEventListener('single-spa:before-routing-event', (event) => {
    const { oldUrl, newUrl } = readRoutingUrls(event);

    // Clean up ripple elements before navigation to prevent accumulation during DOM reparenting
    cleanupSidebarRipples();

    if (shouldSkipDomMoveForNavigation(oldUrl, newUrl)) {
      return;
    }

    if (persistentAppRoot && document.contains(persistentAppRoot)) {
      document.body.appendChild(persistentAppRoot);
    }
  });

  /**
   * Cleanup stale Material ripple elements from sidebar to prevent visual layer accumulation
   * during DOM reparenting between navigation events.
   */
  function cleanupSidebarRipples(): void {
    const sideMenuRoot = document.querySelector('app-side-menu-root');
    if (!sideMenuRoot) {
      return;
    }

    const rippleElements = sideMenuRoot.querySelectorAll('.mat-ripple-element');
    rippleElements.forEach((ripple: HTMLElement) => {
      if (ripple.parentElement) {
        ripple.parentElement.removeChild(ripple);
      }
    });
  }
}

const lifecycles = singleSpaAngular({
  bootstrapFunction: async singleSpaProps => {
    await appConfigLoader.load();
    applyRuntimeTheme({ logPrefix: '[Side-menu]' });
    singleSpaPropsSubject.next(singleSpaProps);
    return platformBrowserDynamic(getSingleSpaExtraProviders()).bootstrapModule(AppModule);
  },
  domElementGetter: (props: any) => {
    if (props && typeof props.domElementGetter === 'function') {
      const el = props.domElementGetter();
      if (el) return el;
    }
    return document.querySelector('.wrapper .side-menu') || document.querySelector('.side-menu') || document.body;
  },
  template: `<app-side-menu-root class="dc-app-root" data-angular="${environment.angularVersion}"></app-side-menu-root>`,
  Router,
  NavigationStart,
  NgZone
});

async function executeLifecycle(lifecycle: unknown, props: unknown): Promise<unknown> {
  if (Array.isArray(lifecycle)) {
    return lifecycle.reduce((chain, fn) => chain.then(() => fn(props)), Promise.resolve());
  }
  if (typeof lifecycle === 'function') {
    return lifecycle(props);
  }
  return Promise.resolve();
}

export const bootstrap = ([] as any[]).concat(appConfigInitializerFactory, registrationInitializerFactory, lifecycles.bootstrap);

export const mount = async (props: any) => {
  let retries = 10;
  while (retries > 0) {
    const container = props && typeof props.domElementGetter === 'function'
      ? props.domElementGetter()
      : document.querySelector('.side-menu');

    if (container) {
      break;
    }
    await new Promise(resolve => setTimeout(resolve, 50));
    retries--;
  }

  const result = await executeLifecycle(lifecycles.mount, props);
  persistentAppRoot = document.querySelector('app-side-menu-root');
  syncAppRootPosition();
  return result;
};

export const unmount = async (props: any) => {
  try {
    const result = await executeLifecycle(lifecycles.unmount, props);
    persistentAppRoot = null;
    return result;
  } catch (err) {
    console.warn('[@dcp/side-menu] Ignored unmount error:', err);
    persistentAppRoot = null;
    return Promise.resolve();
  }
};
