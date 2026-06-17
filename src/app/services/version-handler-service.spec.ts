import { TestBed } from '@angular/core/testing';
import { IonicStorageModule } from '@ionic/storage-angular';

import { VersionHandlerService } from './version-handler-service';

describe('VersionHandlerService', () => {
  let service: VersionHandlerService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [IonicStorageModule.forRoot()]
    });
    service = TestBed.inject(VersionHandlerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
