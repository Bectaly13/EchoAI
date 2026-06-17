import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PersonaFormPage } from './persona-form.page';

describe('PersonaFormPage', () => {
  let component: PersonaFormPage;
  let fixture: ComponentFixture<PersonaFormPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(PersonaFormPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
