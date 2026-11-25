import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import {AppMainMenuComponent} from './app.component';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {HTTP_INTERCEPTORS, HttpClient, HttpClientModule} from '@angular/common/http';
import {NgxPermissionsModule} from 'ngx-permissions';
import {TranslateLoader, TranslateModule} from '@ngx-translate/core';
import {Angulartics2Module} from 'angulartics2';
import {MultiTranslateHttpLoader} from 'ngx-translate-multi-http-loader';
import {SidebarItemsComponent} from "./sidebar-items/sidebar-items.component";
import {EmptyRouteComponent} from "./empty-route/empty-route.component";
import {AppRoutingModule} from "./app-routing.module";
import {Observable} from "rxjs";
import {map} from "rxjs/operators";
import * as _ from 'lodash';
import {CommonModule, Location} from "@angular/common";
import {MatDivider} from "@angular/material/divider";
import {ClickOutsideDirective} from "./shared/click-outside.directive";
import {MatRipple} from "@angular/material/core";
import {MatTooltipModule} from "@angular/material/tooltip";
import {MatIcon} from "@angular/material/icon";
import {APP_CONFIG, DcpRuntimeConfig, GxpApp, GxpInfoInterceptor, OdcpPermissionsService, provideRuntimeConfig} from "@open-dcp/angular-services";
import {appConfigLoader} from "./shared/config/app-config";
import {assetUrl} from "../single-spa/asset-url";
import {environment} from "../environments/environment";


// AoT requires an exported function for factories
export function HttpLoaderFactory(http: HttpClient, config: DcpRuntimeConfig) {
  return {
    getTranslation(lang: string): Observable<any> {
      return new MultiTranslateHttpLoader(http, [
        {prefix: assetUrl('i18n/'), suffix: '.json'},
        {prefix: `${config.baseAppUrl}js/i18n/`, suffix: '.json'},
      ]).getTranslation(lang).pipe(map(translations => {
        const storage = window.sessionStorage;
        const dcpTranslations = JSON.parse(storage.getItem('dcpTranslations')) || {en: {}, de: {}};
        return _.merge(translations, dcpTranslations[lang]);
      }));
    }
  }
}

@NgModule({
  declarations: [
    AppMainMenuComponent,
    SidebarItemsComponent,
    EmptyRouteComponent,
    ClickOutsideDirective
  ],
  imports: [
    CommonModule,
    HttpClientModule,
    BrowserModule,
    MatTooltipModule,
    BrowserAnimationsModule,
    AppRoutingModule,
    TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useFactory: HttpLoaderFactory,
        deps: [HttpClient, APP_CONFIG],
      },
    }),
    NgxPermissionsModule.forRoot(),
    Angulartics2Module.forRoot(),
    MatDivider,
    MatRipple,
    MatIcon
  ],
  providers: [
    Location,
    OdcpPermissionsService,
    provideRuntimeConfig(appConfigLoader),
    {
      provide: GxpApp,
      useValue: {
        name: environment.appName,
        isValidated: environment.isAppValidated
      }
    },
    { provide: HTTP_INTERCEPTORS, useClass: GxpInfoInterceptor, multi: true },
  ],
  bootstrap: [AppMainMenuComponent],
  exports: [
    ClickOutsideDirective
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class AppModule { }
