import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CharacterFormPage } from './character-form.page';

describe('CharacterFormPage', () => {
  let component: CharacterFormPage;
  let fixture: ComponentFixture<CharacterFormPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(CharacterFormPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
