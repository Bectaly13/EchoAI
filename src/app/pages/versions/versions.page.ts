import { Component } from '@angular/core';
import { IonContent, IonHeader } from '@ionic/angular/standalone';

import { VersionHandlerService } from 'src/app/services/version-handler-service';

import { HeaderComponent } from 'src/app/components/header/header.component';

import { ReleaseNote, RELEASE_NOTES } from 'src/app/utils/release-notes';

@Component({
  selector: 'app-versions',
  templateUrl: './versions.page.html',
  styleUrls: ['./versions.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, HeaderComponent]
})
export class VersionsPage {

  // Notes de version, la plus récente en tête.
  releases: ReleaseNote[] = RELEASE_NOTES;

  constructor(
    private version: VersionHandlerService
  ) { }

  // Version commerciale courante, pour marquer la note correspondante « Actuelle ».
  get currentVersion(): string {
    return this.version.appVersionDisplay;
  }
}
