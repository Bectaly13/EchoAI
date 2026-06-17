import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MemoryPage } from './memory.page';

describe('MemoryPage', () => {
  let component: MemoryPage;
  let fixture: ComponentFixture<MemoryPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(MemoryPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
