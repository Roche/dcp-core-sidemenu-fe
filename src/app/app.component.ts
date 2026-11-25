import {Component, NgZone, OnDestroy, OnInit} from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import {Subscription} from "rxjs";
import {uiStore} from "@open-dcp/services";
import {OdcpPermissionsService} from "@open-dcp/angular-services";
/**
 * AppMainMenuComponent - Root component for the side-menu micro-frontend.
 *
 * Selector: app-side-menu-root
 *
 * This is the main application root component that:
 * - Manages translations (i18n)
 * - Listens to global language changes from UI store
 * - Renders the sidebar items component
 *
 * [LOOP-FIX] The previous popstate listener re-navigated this app''s router on
 * every popstate (router.navigateByUrl(location.path(), {replaceUrl, ...})).
 * With the router now inert (see InertUrlHandlingStrategy in app-routing.module),
 * that only produced history churn and re-created the report/list <-> templating
 * /list loop. It is removed: active-menu state is driven by the live URL
 * (SidebarItemsComponent.routeIsActive), which re-evaluates on popstate via zone
 * change-detection, so no manual router sync is needed.
 */
@Component({
  selector: 'app-side-menu-root',
  templateUrl: 'app.component.html'
})
export class AppMainMenuComponent implements OnInit, OnDestroy {
  public subscription: Subscription = new Subscription();
  constructor(
    public readonly translate: TranslateService,
    private readonly _dcPermissionsService: OdcpPermissionsService,
    private readonly ngZone: NgZone
  ) {
    this.initializeTranslations();
  }
  ngOnInit() {
    this.subscribeToLanguageChanges();
  }
  ngOnDestroy() {
    this.subscription.unsubscribe();
  }
  private initializeTranslations(): void {
    this.translate.addLangs(['en', 'de']);
    this.translate.setDefaultLang('en');
  }
  private subscribeToLanguageChanges(): void {
    this.subscription.add(
      uiStore.subscribe('language', language => {
        if (language && language !== this.translate.currentLang) {
          this.ngZone.run(() => {
            this.translate.use(language);
          });
        }
      })
    );
  }
}