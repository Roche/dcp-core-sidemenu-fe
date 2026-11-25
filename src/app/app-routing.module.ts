import { APP_BASE_HREF } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { provideInertUrlHandlingStrategy } from '@open-dcp/angular-services';
import { EmptyRouteComponent } from './empty-route/empty-route.component';
const routes: Routes = [
  /*
   * Makes sure we don't try to show a 404 ou error while single-spa is transitioning between routes
   * https://single-spa.js.org/docs/ecosystem-angular#configure-routes
   */
  { path: '**', component: EmptyRouteComponent },
];
@NgModule({
  imports: [RouterModule.forRoot(routes, {
    onSameUrlNavigation: 'ignore'
  })],
  exports: [RouterModule],
  providers: [
    /*
     * Should be same as mount in root, but have strange effects when navigate between apps.
     * https://single-spa.js.org/docs/ecosystem-angular#configure-routes
     */
    { provide: APP_BASE_HREF, useValue: '/' },
    /*
     * [LOOP-FIX] The side-menu is an always-mounted shell that owns no routes.
     * This shared strategy (from @open-dcp/angular-services) makes its router
     * ignore every URL so it never navigates / stamps a navigationId into the
     * shared window.history - which previously caused co-mounted single-spa
     * Angular routers to ping-pong (report/list <-> templating/list). Navigation
     * is done via history.pushState (SidebarItemsComponent.navigate). Keep the
     * '**' route for 404-safety.
     */
    provideInertUrlHandlingStrategy(),
  ],
})
export class AppRoutingModule { }