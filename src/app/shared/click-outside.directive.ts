import {Directive, ElementRef, Output, EventEmitter, HostListener} from '@angular/core';

/**
 * ClickOutsideDirective - Emit event when user clicks outside element.
 *
 * Selector: [appClickOutside]
 *
 * Usage:
 * <div (appClickOutside)="onClickOutside()">
 *   Content
 * </div>
 *
 * Component Structure (as per AGENTS.md guidelines):
 * 1. Property fields (@Output decorators)
 * 2. Constructor
 * 3. Lifecycle hooks (none for directive in this case)
 * 4. Public methods
 * 5. Private methods
 *
 * Triggers when user clicks on document outside the directive's host element.
 */
@Directive({
  selector: '[appClickOutside]'
})
export class ClickOutsideDirective {

  @Output()
  public appClickOutside = new EventEmitter<MouseEvent>();

  constructor(private readonly _elementRef: ElementRef) {
  }

  /**
   * Emits appClickOutside event if click occurred outside the host element.
   *
   * @param event Mouse event
   * @param targetElement Element that was clicked
   */
  @HostListener('document:click', ['$event', '$event.target'])
  public onClick(event: MouseEvent, targetElement: HTMLElement): void {
    this.handleClickOutside(event, targetElement);
  }


  /**
   * Determine if click was outside element and emit event if so.
   *
   * @param event Mouse event from document click
   * @param targetElement Target element that was clicked
   */
  private handleClickOutside(event: MouseEvent, targetElement: HTMLElement): void {
    if (!targetElement) {
      return;
    }

    const clickedInside = this._elementRef.nativeElement.contains(targetElement);
    if (!clickedInside) {
      this.appClickOutside.emit(event);
    }
  }
}
