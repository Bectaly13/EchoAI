import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VersionsPage } from './versions.page';

describe('VersionsPage', () => {
  let component: VersionsPage;
  let fixture: ComponentFixture<VersionsPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(VersionsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
