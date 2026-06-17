import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PersonasPage } from './personas.page';

describe('PersonasPage', () => {
  let component: PersonasPage;
  let fixture: ComponentFixture<PersonasPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(PersonasPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
