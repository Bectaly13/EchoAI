import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { ConversationsPage } from './conversations.page';

describe('ConversationsPage', () => {
  let component: ConversationsPage;
  let fixture: ComponentFixture<ConversationsPage>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([])]
    });
    fixture = TestBed.createComponent(ConversationsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
