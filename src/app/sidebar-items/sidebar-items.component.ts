import {Component, OnInit, OnChanges, SimpleChanges, OnDestroy, NgZone, ElementRef, Input} from '@angular/core';
import {Router} from "@angular/router";
import {uiStore} from "@open-dcp/services";
import {BehaviorSubject, Subscription} from 'rxjs';
import {ActiveModules} from "@open-dcp/services/dist/types/stores";

/**
 * SidebarItemsComponent - Main sidebar navigation component.
 *
 * Manages:
 * - Menu state management (expanded/collapsed submenus)
 * - Site context tracking
 * - Active module state
 * - Navigation logic
 * - Main menu items rendering
 * - Submenu management
 * - Custom module navigation
 * - Material ripple effects with proper cleanup
 *
 * Component Structure (as per AGENTS.md guidelines):
 * 1. @Input/@Output decorators
 * 2. Property fields
 * 3. Constructor
 * 4. Lifecycle hooks (ngOnInit, ngOnChanges, ngOnDestroy)
 * 5. Public methods
 * 6. Protected methods
 * 7. Private methods
 */
@Component({
  selector: 'app-sidebar-items',
  templateUrl: './sidebar-items.component.html',
  styleUrls: ['./sidebar-items.component.scss']
})
export class SidebarItemsComponent implements OnInit, OnChanges, OnDestroy {

  @Input() isMobile: any;
  @Input() showFullMenuText: boolean;

  menuState = new BehaviorSubject<{expanded: any}>({ expanded: {} });
  siteContext = new BehaviorSubject<number>(0);
  activeModules: ActiveModules[] = [];
  subscription: Subscription = new Subscription();
  mainMenuConfig: any[] = [];

  constructor(
    private readonly ngZone: NgZone,
    private readonly router: Router,
    private readonly elementRef: ElementRef
  ) {
  }

  ngOnInit() {
    this.loadMenuConfig();
    this.subscribeToStoreUpdates();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['showFullMenuText']) {
      this.showFullMenuText = !!changes['showFullMenuText'].currentValue;
    }
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
    this.cleanupRippleElements();
  }

  /**
   * Toggle menu module expansion state.
   * @param $event Click event
   * @param module Module name
   */
  public toggleMenuModule($event: any, module: string) {
    $event.stopImmediatePropagation();
    const menu = uiStore.getState().menu;
    uiStore.setMenu({
      expanded: {
        ...menu.expanded,
        [module]: !menu.expanded[module]
      }
    });
  }

  /**
   * Check if module is active and enabled.
   * @param module Module information
   * @returns true if module is active
   */
  public checkForActiveModule(module: {name: string, globalScope: boolean}) {
    if (module.globalScope) {
      return true;
    }
    return this.activeModules.findIndex(activeModule => activeModule.name === module.name && activeModule.enabled) > -1;
  }

  /**
   * Check if given URL is currently active in the router.
   * @param url URL to check
   * @returns true if URL is active
   */
  public routeIsActive(url: string) {
    return location.href.includes(url);
  }

  /**
   * Detect if button uses custom module navigation.
   * @param subButton Navigation button configuration
   * @returns true if custom navigation enabled
   */
  public isCustomModuleNavigation(subButton: any): boolean {
    return !!(subButton?.useCustomModuleNavigation ?? subButton?.useDcpSync ?? false);
  }

  /**
   * Navigate to module URL with ripple cleanup.
   * Handles both global scope (global) and site-specific modules.
   * Ensures ripples are cleaned before navigation to prevent accumulation.
   *
   * @param url Target URL within module
   * @param module Module information (name, globalScope flag)
   */
  public navigateToModuleUrl(url: string, module: { name: string, globalScope: boolean }) {
    this.cleanupRippleElements();

    const siteContext = uiStore.getState()?.site?.id;
    const pathSegments = window.location.pathname.split('/').filter(Boolean);
    const appIndex = pathSegments.indexOf('app');
    const currentSiteSegment = appIndex >= 0 ? pathSegments[appIndex + 1] : null;
    const resolvedSiteSegment = typeof siteContext === 'number'
      ? `${siteContext}`
      : (currentSiteSegment || '0');

    if (module.globalScope) {
      this.navigate(`/app/global${url}`);
      return;
    }
    this.navigate(`/app/${resolvedSiteSegment}${url}`);
  }

  /**
   * Cleans up stale ripple elements to prevent visual layer accumulation.
   * Called before navigation when DOM might be reparented.
   */
  /**
   * [LOOP-FIX] Navigate by changing the browser URL directly so single-spa
   * reroutes and the app that OWNS the route handles it. We deliberately do NOT
   * use this app router (kept inert via InertUrlHandlingStrategy) to avoid two
   * routers stamping navigationId into shared history.state, which caused the
   * report/list <-> templating/list popstate loop. Comparing against the live
   * URL also fixes re-clicking a button after the owning app changed the URL.
   */
  public navigate(path: string): void {
    this.cleanupRippleElements();
    history.pushState(null, '', path);
  }  protected cleanupRippleElements(): void {
    if (!this.elementRef?.nativeElement) {
      return;
    }

    const rippleElements = this.elementRef.nativeElement.querySelectorAll('.mat-ripple-element');
    rippleElements.forEach((ripple: HTMLElement) => {
      if (ripple.parentElement) {
        ripple.parentElement.removeChild(ripple);
      }
    });
  }

  /**
   * Load menu configuration from localStorage.
   * Applies special permissions handling for administration menu item.
   */
  private loadMenuConfig(): void {
    const localStorage = window.localStorage;
    this.mainMenuConfig = JSON.parse(localStorage.getItem('mainMenu')).map(item => {
      if (item.url === '/administration') {
        item = {
          ...item,
          ngxPermissionsOnly: ['PLATFORMADMIN']
        };
      }
      return item;
    });
  }

  /**
   * Subscribe to all UI store updates.
   * Listens for changes in:
   * - activeModules: List of enabled modules
   * - site: Current site context
   * - menu: Menu expansion state
   */
  private subscribeToStoreUpdates(): void {
    const uiState = uiStore.getState();
    this.activeModules = uiState?.activeModules || [];
    this.menuState.next(uiState?.menu);
    const initialSiteId = typeof uiState?.site?.id === 'number' ? uiState.site.id : 0;
    this.siteContext.next(initialSiteId);

    this.subscription.add(
      uiStore.subscribe('activeModules', activeModules => {
        this.ngZone.run(() => {
          this.activeModules = activeModules;
        });
      })
    );

    this.subscription.add(
      uiStore.subscribe('site', site => {
        this.ngZone.run(() => {
          if (typeof site?.id === 'number') {
            this.siteContext.next(site.id);
          }
        });
      })
    );

    this.subscription.add(
      uiStore.subscribe('menu', menu => {
        this.ngZone.run(() => {
          this.menuState.next(menu);
        });
      })
    );
  }
}
